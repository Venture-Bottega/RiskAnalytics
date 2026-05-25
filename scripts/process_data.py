"""
process_data.py — Civil Protection Risk Prioritization ETL (v1)
Regions: Toscana (9), Umbria (10), Lazio (12), Abruzzo (13)

Civil Protection Priority Score = weighted sum of 5 indicators:
  SEISMIC_WEIGHT   * seismic_score       (zone 1=high risk)
  FLOOD_WEIGHT     * flood_ls_score      (ISPRA hydraulic + landslide)
  WILDFIRE_WEIGHT  * wildfire_score      (EFFIS burned area 2016-2026)
  VULN_WEIGHT      * vulnerability_score (elderly population share)
  INFRA_WEIGHT     * infra_risk_score    (inverse hospital coverage)

High score = HIGH PRIORITY / HIGH RISK.
Each component min-max normalised to [0, 100] before combining.
"""

import os, json, time, warnings
import numpy as np
import pandas as pd
import geopandas as gpd
import requests
from shapely.geometry import box
from scipy.stats import percentileofscore

warnings.filterwarnings("ignore")

# ── paths ─────────────────────────────────────────────────────────────────────
BASE    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE, "data/processed")
os.makedirs(OUT_DIR, exist_ok=True)

COMUNI_SHP    = os.path.join(BASE, "data/raw/istat_admin_boundaries_2025/Com01012025/Com01012025_WGS84.shp")
SEISMIC_CSV   = os.path.join(BASE, "data/raw/sismic_classification_2025/classificazione-sismica-aggiornata-maggio-2025.csv")
ISPRA_CSV     = os.path.join(BASE, "data/raw/ispra_flood_landslide/comuni_pir.csv")
EFFIS_SHP     = os.path.join(BASE, "data/raw/effis/effis_layer/modis.ba.poly.shp")
OSM_CACHE_CSV = os.path.join(OUT_DIR, "osm_infrastructure.csv")
OUT_GEOJSON   = os.path.join(OUT_DIR, "municipalities.geojson")
OUT_JSON      = os.path.join(OUT_DIR, "lazio_neighborhoods.json")
OUT_INSIGHTS  = os.path.join(OUT_DIR, "lazio_insights.json")

# ── regions ───────────────────────────────────────────────────────────────────
TARGET_REGIONS = {9: "Toscana", 10: "Umbria", 12: "Lazio", 13: "Abruzzo"}

# ── weights (must sum to 1.0) ─────────────────────────────────────────────────
SEISMIC_WEIGHT  = 0.25
FLOOD_WEIGHT    = 0.30
WILDFIRE_WEIGHT = 0.15
VULN_WEIGHT     = 0.20
INFRA_WEIGHT    = 0.10
assert round(SEISMIC_WEIGHT + FLOOD_WEIGHT + WILDFIRE_WEIGHT + VULN_WEIGHT + INFRA_WEIGHT, 10) == 1.0

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# ── helpers ───────────────────────────────────────────────────────────────────
def minmax_norm(arr, invert=False):
    lo, hi = np.nanmin(arr), np.nanmax(arr)
    if hi == lo:
        return np.full_like(arr, 50.0, dtype=float)
    normed = (arr - lo) / (hi - lo) * 100.0
    return 100.0 - normed if invert else normed

def pct_rank(arr):
    return np.array([percentileofscore(arr, v, kind="rank") for v in arr])

# ── 1. Load comuni ─────────────────────────────────────────────────────────────
print("Loading ISTAT comuni shapefile …")
comuni = gpd.read_file(COMUNI_SHP)
name_col = next(c for c in ["COMUNE", "DEN_COM"] if c in comuni.columns)
id_col   = next(c for c in ["PRO_COM_T", "PRO_COM"] if c in comuni.columns)
reg_col  = next(c for c in ["COD_REG", "REGIONE"] if c in comuni.columns)

study = comuni[comuni[reg_col].isin(TARGET_REGIONS.keys())].copy()
study["region_name"] = study[reg_col].map(TARGET_REGIONS)
study["id_str"] = study[id_col].astype(str).str.zfill(6)
print(f"  Comuni in study area: {len(study)}")

study_wgs = study.to_crs(4326)
bbox_wgs84 = study_wgs.total_bounds  # [minx, miny, maxx, maxy]

# ── 2. Seismic Hazard ─────────────────────────────────────────────────────────
print("\nLoading seismic classification …")
seismic_df = pd.read_csv(SEISMIC_CSV, sep=";", dtype=str, encoding="utf-8-sig")
seismic_df.columns = [c.strip() for c in seismic_df.columns]
seismic_df["COD_ISTAT_COMUNE"] = seismic_df["COD_ISTAT_COMUNE"].astype(str).str.strip().str.zfill(6)

# Zone mapping: 1=highest seismicity (score 100), 2=66, 3/3S=33, 4=0
zone_score_map = {"1": 100, "2": 66, "3": 33, "3S": 33, "4": 0}
seismic_df["seismic_score_raw"] = seismic_df["ZONA_SISMICA"].str.strip().map(zone_score_map).fillna(33)
seismic_lookup = seismic_df.set_index("COD_ISTAT_COMUNE")["seismic_score_raw"].to_dict()
seismic_class_lookup = seismic_df.set_index("COD_ISTAT_COMUNE")["ZONA_SISMICA"].to_dict()

study["seismic_score_raw"] = study["id_str"].map(seismic_lookup).fillna(33)
study["seismic_zone"] = study["id_str"].map(seismic_class_lookup).fillna("3")
matched = study["seismic_score_raw"].notna().sum()
print(f"  Seismic zones matched: {matched}/{len(study)}")

# ── 3. Flood & Landslide (ISPRA) ───────────────────────────────────────────────
print("\nLoading ISPRA flood/landslide data …")
ispra = pd.read_csv(ISPRA_CSV, dtype=str)
ispra.columns = [c.strip().strip('"') for c in ispra.columns]
ispra["pro_com"] = ispra["pro_com"].astype(str).str.strip().str.strip('"').str.zfill(6)

def safe_float(series):
    s = pd.to_numeric(series, errors="coerce")
    s[s == -1] = np.nan
    return s

# Flood: % population at high hydraulic risk (P3)
ispra["flood_pop_pct"]  = safe_float(ispra.get("popidp3_p", pd.Series([np.nan]*len(ispra))))
# Flood: % area at high hydraulic risk (P3)
ispra["flood_area_pct"] = safe_float(ispra.get("aridp3_p", pd.Series([np.nan]*len(ispra))))
# Landslide: % area at P3+P4 (high+very high)
ispra["ls_area_pct"]    = safe_float(ispra.get("ar_frp3p4p", pd.Series([np.nan]*len(ispra))))
# Landslide: % pop at P3+P4
ispra["ls_pop_pct"]     = safe_float(ispra.get("popfrp3p4p", pd.Series([np.nan]*len(ispra))))

# Population vulnerability
ispra["pop_anz_p"] = safe_float(ispra.get("pop_anz_p", pd.Series([np.nan]*len(ispra))))  # elderly %
ispra["pop_gio_p"] = safe_float(ispra.get("pop_gio_p", pd.Series([np.nan]*len(ispra))))  # youth %
ispra["pop_res"]   = safe_float(ispra.get("pop_res021", pd.Series([np.nan]*len(ispra))))

ispra_lookup = ispra.set_index("pro_com")[
    ["flood_pop_pct", "flood_area_pct", "ls_area_pct", "ls_pop_pct",
     "pop_anz_p", "pop_gio_p", "pop_res"]
].to_dict(orient="index")

for col in ["flood_pop_pct", "flood_area_pct", "ls_area_pct", "ls_pop_pct",
            "pop_anz_p", "pop_gio_p", "pop_res"]:
    study[col] = study["id_str"].map(lambda x, c=col: ispra_lookup.get(x, {}).get(c, np.nan))

matched_ispra = study["flood_pop_pct"].notna().sum()
print(f"  ISPRA matched: {matched_ispra}/{len(study)}")

# Composite flood+landslide index: blend area and population exposure
study["flood_index"] = study[["flood_pop_pct", "flood_area_pct"]].mean(axis=1).fillna(0)
study["ls_index"]    = study[["ls_area_pct", "ls_pop_pct"]].mean(axis=1).fillna(0)
study["flood_ls_raw"] = 0.55 * study["flood_index"] + 0.45 * study["ls_index"]

# Population vulnerability: 70% elderly share + 30% youth share
study["vulnerability_raw"] = (
    0.70 * study["pop_anz_p"].fillna(study["pop_anz_p"].median()) +
    0.30 * study["pop_gio_p"].fillna(study["pop_gio_p"].median())
)

# ── 4. Wildfire Exposure (EFFIS) ───────────────────────────────────────────────
print("\nProcessing EFFIS wildfire data …")
WILDFIRE_CACHE = os.path.join(OUT_DIR, "wildfire_scores.csv")

if os.path.exists(WILDFIRE_CACHE):
    print(f"  Loading from cache: {WILDFIRE_CACHE}")
    wf_cache = pd.read_csv(WILDFIRE_CACHE, dtype={"id": str})
    wildfire_lookup = wf_cache.set_index("id")["wildfire_ha"].to_dict()
else:
    print("  Reading EFFIS shapefile (this may take a moment) …")
    effis = gpd.read_file(EFFIS_SHP)
    effis = effis[effis["COUNTRY"] == "IT"].copy()
    # Clip to study area bounding box
    bbox_geom = box(*bbox_wgs84)
    effis = effis[effis.geometry.intersects(bbox_geom)].copy()
    print(f"  Italy fire polygons in study area bbox: {len(effis)}")

    effis = effis.to_crs(study_wgs.crs)
    study_wgs_copy = study_wgs[["id_str", "geometry"]].copy()

    # Spatial join: sum burned area (ha) per comune
    joined = gpd.sjoin(effis[["AREA_HA", "geometry"]], study_wgs_copy,
                       how="left", predicate="intersects")
    joined["AREA_HA_num"] = pd.to_numeric(joined["AREA_HA"], errors="coerce").fillna(0)
    agg = joined.groupby("id_str")["AREA_HA_num"].sum().reset_index()
    agg.columns = ["id", "wildfire_ha"]

    wf_df = study_wgs_copy[["id_str"]].rename(columns={"id_str": "id"}).merge(
        agg, on="id", how="left"
    ).fillna(0)
    wf_df.to_csv(WILDFIRE_CACHE, index=False)
    print(f"  Saved wildfire cache: {WILDFIRE_CACHE}")
    wildfire_lookup = wf_df.set_index("id")["wildfire_ha"].to_dict()

study["wildfire_ha"] = study["id_str"].map(wildfire_lookup).fillna(0)
print(f"  Comuni with any fire history: {(study['wildfire_ha'] > 0).sum()}")

# ── 5. Emergency Infrastructure (OSM hospitals) ───────────────────────────────
print("\nFetching hospital infrastructure from OpenStreetMap …")

if os.path.exists(OSM_CACHE_CSV):
    print(f"  Loading from cache: {OSM_CACHE_CSV}")
    osm_df = pd.read_csv(OSM_CACHE_CSV, dtype={"id": str})
    osm_lookup = osm_df.set_index("id").to_dict(orient="index")
else:
    from shapely.geometry import Point
    b = bbox_wgs84
    bbox_str = f"{b[1]:.3f},{b[0]:.3f},{b[3]:.3f},{b[2]:.3f}"
    tags = 'node["amenity"="hospital"]'
    query = f'[out:json][timeout:120];({tags}({bbox_str}););out;'
    osm_rows = []
    try:
        r = requests.get(OVERPASS_URL, params={"data": query}, timeout=150)
        r.raise_for_status()
        elements = r.json().get("elements", [])
        print(f"  Hospitals found: {len(elements)}")
        for el in elements:
            if el.get("lat") and el.get("lon"):
                osm_rows.append({"lat": el["lat"], "lon": el["lon"]})
        time.sleep(2)
    except Exception as e:
        print(f"  WARNING: OSM query failed ({e})")

    if osm_rows:
        osm_gdf = gpd.GeoDataFrame(
            osm_rows,
            geometry=[Point(r["lon"], r["lat"]) for r in osm_rows],
            crs=4326
        )
        joined_osm = gpd.sjoin(osm_gdf, study_wgs[["id_str", "geometry"]], how="left", predicate="within")
        counts = joined_osm.groupby("id_str").size().reset_index(name="hospitals")
        osm_df = study[["id_str"]].rename(columns={"id_str": "id"}).merge(
            counts.rename(columns={"id_str": "id"}), on="id", how="left"
        ).fillna(0).astype({"hospitals": int})
    else:
        osm_df = study[["id_str"]].rename(columns={"id_str": "id"}).copy()
        osm_df["hospitals"] = 0

    osm_df.to_csv(OSM_CACHE_CSV, index=False)
    osm_lookup = osm_df.set_index("id").to_dict(orient="index")

study["osm_hospitals"] = study["id_str"].map(lambda x: osm_lookup.get(x, {}).get("hospitals", 0))

# Hospital coverage: hospitals per 10,000 residents (low coverage = high risk)
pop_ref = study["pop_res"].fillna(study["pop_res"].median())
study["hospitals_per_10k"] = np.where(
    pop_ref > 0,
    study["osm_hospitals"] / (pop_ref / 10000.0),
    0.0
)
# Infra risk = INVERSE of coverage (low coverage → high risk)
study["infra_risk_raw"] = study["hospitals_per_10k"]  # will be inverted during normalisation

print(f"  Hospitals joined. Total: {study['osm_hospitals'].sum():.0f}")

# ── 6. Compute Civil Protection Priority Score ────────────────────────────────
print("\nComputing Civil Protection Priority Score …")

seismic_norm  = study["seismic_score_raw"].values.astype(float)           # already 0-100
flood_norm    = minmax_norm(study["flood_ls_raw"].values.astype(float))
wildfire_norm = minmax_norm(study["wildfire_ha"].values.astype(float))
vuln_norm     = minmax_norm(study["vulnerability_raw"].values.astype(float))
infra_norm    = minmax_norm(study["infra_risk_raw"].values.astype(float), invert=True)  # invert: low coverage=high risk

study["seismic_score"]  = np.round(seismic_norm,  1)
study["flood_score"]    = np.round(flood_norm,    1)
study["wildfire_score"] = np.round(wildfire_norm, 1)
study["vuln_score"]     = np.round(vuln_norm,     1)
study["infra_score"]    = np.round(infra_norm,    1)

study["prospectScore"] = np.round(
    SEISMIC_WEIGHT  * seismic_norm  +
    FLOOD_WEIGHT    * flood_norm    +
    WILDFIRE_WEIGHT * wildfire_norm +
    VULN_WEIGHT     * vuln_norm     +
    INFRA_WEIGHT    * infra_norm,
    1
)

# ── 7. Statistics ─────────────────────────────────────────────────────────────
print("\n" + "═"*65)
print("CENTRAL ITALY — Civil Protection Priority Score Summary")
print("═"*65)
score = study["prospectScore"]
print(f"\n{'Score':<28} min={score.min():.1f}  median={score.median():.1f}  max={score.max():.1f}")
print("\n  Top 10 highest-risk:")
study_sorted = study.copy()
study_sorted["_name"] = study[name_col].values
for _, r in study_sorted.nlargest(10, "prospectScore").iterrows():
    print(f"    {r['_name']:<28} {r['region_name']:<10}  Zone={r['seismic_zone']}  Flood={r['flood_ls_raw']:.1f}  Score={r['prospectScore']:.1f}")

insights = {
    "regions": list(TARGET_REGIONS.values()),
    "n_comuni": int(len(study)),
    "score_version": "civil_v1",
    "weights": {
        "seismic":   SEISMIC_WEIGHT,
        "flood_ls":  FLOOD_WEIGHT,
        "wildfire":  WILDFIRE_WEIGHT,
        "vuln":      VULN_WEIGHT,
        "infra":     INFRA_WEIGHT,
    },
    "score": {"min": float(score.min()), "median": float(score.median()), "max": float(score.max())},
}
with open(OUT_INSIGHTS, "w") as f:
    json.dump(insights, f, indent=2)

# ── 8. Export GeoJSON ──────────────────────────────────────────────────────────
print("\nExporting GeoJSON …")
out_wgs = study.to_crs(4326)
out_wgs["geometry"] = out_wgs["geometry"].simplify(0.001, preserve_topology=True)
keep = [
    id_col, name_col, "region_name",
    "seismic_zone", "seismic_score", "flood_score", "wildfire_score",
    "vuln_score", "infra_score", "prospectScore", "geometry"
]
out_gdf = out_wgs[[c for c in keep if c in out_wgs.columns]].copy()
out_gdf = out_gdf.rename(columns={id_col: "id", name_col: "name"})
out_gdf["id"] = out_gdf["id"].astype(str)
out_gdf.to_file(OUT_GEOJSON, driver="GeoJSON")
print(f"  Saved: {OUT_GEOJSON}  ({len(out_gdf)} features)")

# ── 9. Export neighborhoods JSON ───────────────────────────────────────────────
print("Exporting neighborhoods JSON …")
score_min = float(out_gdf["prospectScore"].min())
score_max = float(out_gdf["prospectScore"].max())
neighborhoods = []

ZONE_LABELS = {"1": "Zone 1 – Very High", "2": "Zone 2 – High",
               "3": "Zone 3 – Medium", "3S": "Zone 3S – Medium", "4": "Zone 4 – Low"}

for _, row in out_gdf.iterrows():
    iid     = str(row["id"])
    name_v  = str(row["name"])
    reg_v   = str(row.get("region_name", ""))
    sc_v    = float(row["prospectScore"])
    seiz    = float(row.get("seismic_score", 0))
    flood   = float(row.get("flood_score", 0))
    wf      = float(row.get("wildfire_score", 0))
    vuln    = float(row.get("vuln_score", 0))
    infra   = float(row.get("infra_score", 0))
    zone    = str(study.loc[study["id_str"] == iid, "seismic_zone"].values[0] if iid in study["id_str"].values else "3")
    hosp    = int(study.loc[study["id_str"] == iid, "osm_hospitals"].values[0] if iid in study["id_str"].values else 0)
    wf_ha   = float(study.loc[study["id_str"] == iid, "wildfire_ha"].values[0] if iid in study["id_str"].values else 0)
    fl_raw  = float(study.loc[study["id_str"] == iid, "flood_ls_raw"].values[0] if iid in study["id_str"].values else 0)
    anz_p   = float(study.loc[study["id_str"] == iid, "pop_anz_p"].values[0] if iid in study["id_str"].values else 0)
    pop_r   = float(study.loc[study["id_str"] == iid, "pop_res"].values[0] if iid in study["id_str"].values else 0)

    # Narrative
    signals = []
    if seiz >= 66: signals.append(f"seismic zone {zone} (high hazard)")
    if flood >= 60: signals.append("significant flood/landslide exposure")
    if wf >= 50: signals.append(f"wildfire history ({wf_ha:.0f} ha burned since 2016)")
    if vuln >= 60: signals.append(f"high elderly population ({anz_p:.1f}% over 64)")
    if infra >= 60: signals.append("limited hospital coverage")
    drivers = ", ".join(signals) if signals else "moderate multi-hazard risk profile"

    explanation = (
        f"{name_v} ({reg_v}) shows {drivers}. "
        f"Seismic classification: {ZONE_LABELS.get(zone, zone)}. "
        f"Flood/landslide composite index: {fl_raw:.1f}. "
        f"Wildfire area recorded since 2016: {wf_ha:.0f} ha. "
        f"Elderly residents (>64): {anz_p:.1f}%. "
        f"Hospitals in commune: {hosp}."
    ).strip()

    neighborhoods.append({
        "id":           iid,
        "name":         name_v,
        "region":       reg_v,
        "prospectScore": round(sc_v, 1),
        "scoreMin":     round(score_min, 1),
        "scoreMax":     round(score_max, 1),
        "explanation":  explanation,
        "indicators": [
            {
                "key": "seismicHazard", "label": "Seismic Hazard",
                "value": round(seiz, 1), "score": round(seiz, 1),
                "unit": "", "weight": SEISMIC_WEIGHT,
                "note": f"Zone {zone}",
            },
            {
                "key": "floodLandslide", "label": "Flood / Landslide Risk",
                "value": round(fl_raw, 1), "score": round(flood, 1),
                "unit": "", "weight": FLOOD_WEIGHT,
                "note": "ISPRA 2020/2024",
            },
            {
                "key": "wildfireExposure", "label": "Wildfire Exposure",
                "value": round(wf_ha, 0), "score": round(wf, 1),
                "unit": " ha", "weight": WILDFIRE_WEIGHT,
                "note": "EFFIS 2016–2026",
            },
            {
                "key": "populationVulnerability", "label": "Population Vulnerability",
                "value": round(anz_p, 1), "score": round(vuln, 1),
                "unit": "%", "weight": VULN_WEIGHT,
                "note": "Elderly share (ISTAT 2021)",
            },
            {
                "key": "emergencyCoverage", "label": "Emergency Coverage",
                "value": hosp, "score": round(infra, 1),
                "unit": " hosp.", "weight": INFRA_WEIGHT,
                "note": "Hospitals (OSM) — inverted",
            },
        ],
        "infrastructure": {
            "hospitals":    hosp,
            "wildfire_ha":  round(wf_ha, 0),
            "seismic_zone": zone,
        },
    })

neighborhoods.sort(key=lambda x: x["prospectScore"], reverse=True)
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(neighborhoods, f, ensure_ascii=False, indent=2)
print(f"  Saved: {OUT_JSON}  ({len(neighborhoods)} entries)")

# ── 10. Sync to risk-prospect React app ───────────────────────────────────────
import shutil
REACT_DATA_DIR   = os.path.join(BASE, "risk-prospect/src/data")
REACT_PUBLIC_DIR = os.path.join(BASE, "risk-prospect/public")
os.makedirs(REACT_DATA_DIR,   exist_ok=True)
os.makedirs(REACT_PUBLIC_DIR, exist_ok=True)

shutil.copy2(OUT_JSON,    os.path.join(REACT_DATA_DIR, "lazio_neighborhoods.json"))
shutil.copy2(OUT_GEOJSON, os.path.join(REACT_PUBLIC_DIR, "municipalities.geojson"))
print(f"  Synced to risk-prospect/")
print("Done ✓")
