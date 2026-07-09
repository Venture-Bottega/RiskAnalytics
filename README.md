# RiskWatch Italia

> Civil Protection Risk Prioritization for Central Italy

---

## What is RiskWatch Italia?

RiskWatch Italia ranks **~1,050 Italian municipalities** across four central regions (Toscana, Umbria, Lazio, Abruzzo) using a transparent **Civil Protection Priority Score** — a multi-hazard composite index designed to help prioritize emergency preparedness and resource allocation.

It combines open government and satellite datasets into a single, interpretable score. A high score means a municipality faces a **higher cumulative risk burden** and deserves priority attention from civil protection services.

> **Which communes are most at risk. Why. And what drives it.**

---

## Priority Score — Methodology

### Indicators

| Indicator | Source | Coverage | Weight | Direction |
|-----------|--------|----------|--------|-----------|
| **Seismic Hazard** | DPC / PCM 2025 classification | Italy-wide | 25% | High zone (1) = highest risk |
| **Flood & Landslide Risk** | ISPRA PIR 2020/2024 | Italy-wide | 30% | % population + area exposed (P3/P4) |
| **Wildfire Exposure** | EFFIS / Copernicus 2016–2026 | EU | 15% | Cumulative burned area (ha) |
| **Population Vulnerability** | ISPRA PIR (ISTAT 2021 base) | Italy-wide | 20% | Elderly share (>64 yrs) |
| **Emergency Coverage** | OpenStreetMap via Overpass API | Italy-wide | 10% | Hospitals per capita — inverted |

All indicators are independently **min-max normalised to [0–100]** before combining. High score = high priority.

### Formula

```
Priority Score = 0.25 × seismic_score
              + 0.30 × flood_landslide_score
              + 0.15 × wildfire_score
              + 0.20 × vulnerability_score
              + 0.10 × infra_risk_score
```

Weights are user-adjustable in the interface — sliders recalculate scores in real time with no page reload.

---

## Study Area

**4 regions · ~1,050 municipalities**

| Region | Comuni | Notes |
|--------|--------|-------|
| Lazio | 378 | Includes Rome and surrounding Apennine communes |
| Toscana | 273 | Arno basin flood risk + Apennine seismicity |
| Umbria | 92 | High seismic exposure, 2016 earthquake epicenter zone |
| Abruzzo | 305 | Gran Sasso area — seismic + wildfire |

---

## Features

### Landing page
- Platform overview and methodology summary
- Who it is for and what the score means
- Contact / demo request form (submissions → private Google Sheet via Apps Script, no backend)

### Interactive risk map
- All municipalities coloured by Priority Score (green → amber → red)
- Colour scale normalised to the actual data range
- Hover tooltip showing score + all 5 indicator values
- Click any municipality to open its detail panel

### Ranked sidebar
- Full leaderboard, highest → lowest priority
- **Region filter** — toggle any combination of the 4 regions
- **Min score slider** — hide lower-risk municipalities
- Collapse / expand button

### Customise Weights panel
- Floating panel on the map — five sliders (one per hazard indicator)
- Auto-normalisation: adjust any slider and the rest scale proportionally to keep the total at 100%
- Map recolours and ranking reorders instantly
- Reset button restores default weights

### Compare mode
- Select any 2 municipalities for a side-by-side overlay
- Score bars, indicator breakdown, and infrastructure counts compared
- Both communes highlighted on the map simultaneously

### Detail panel
- Priority Score with region and narrative explanation
- Per-indicator breakdown with bars, data source labels, and raw values
- Infrastructure card (hospitals in commune, wildfire ha burned, seismic zone)
- Collapsible score breakdown and data sources section

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite |
| Map | Leaflet + react-leaflet |
| Geo processing | Python · GeoPandas · SciPy |
| Seismic | DPC national seismic classification 2025 (CSV) |
| Flood / Landslide | ISPRA PIR 2020/2024 (CSV) |
| Wildfire | EFFIS MODIS burned-area polygons (Shapefile) |
| Boundaries | ISTAT Comuni 2025 shapefile |
| OSM Infrastructure | Overpass API — bulk spatial join (cached) |
| Deployment | GitHub Pages via GitHub Actions (auto-deploy on `main` push) |

---

## Running Locally

```bash
# Frontend
cd risk-prospect
npm install
npm run dev    # → http://localhost:5173/RiskAnalytics/
```

Re-run the data pipeline (Python venv required):

```bash
# From repo root
python scripts/process_data.py
```

Required Python packages:

```bash
pip install geopandas scipy requests pandas numpy shapely
```

**Caches** — wildfire scores (`wildfire_scores.csv`) and OSM hospital data (`osm_infrastructure.csv`) are saved to `data/processed/` after first run. Delete them to force a full refresh from source.

---

## Project Structure

```
RiskAnalytics/
├── scripts/
│   └── process_data.py              # Full ETL pipeline — run to regenerate data
├── data/
│   ├── raw/                         # ⚠ Not committed (excluded by .gitignore)
│   │   ├── istat_admin_boundaries_2025/   # ISTAT comuni shapefile
│   │   ├── sismic_classification_2025/    # DPC seismic zone CSV
│   │   ├── ispra_flood_landslide/         # ISPRA PIR CSV
│   │   ├── effis/                         # EFFIS burned-area shapefile
│   │   ├── pop_2024/                      # ISTAT population CSVs
│   │   └── pop_2025/
│   └── processed/                   # ✓ Committed — generated outputs
│       ├── lazio_neighborhoods.json # Full municipality data (all indicators)
│       ├── municipalities.geojson   # Simplified boundaries + scores
│       ├── wildfire_scores.csv      # EFFIS spatial join cache
│       └── osm_infrastructure.csv   # Overpass hospital join cache
└── risk-prospect/                   # React application
    ├── .github/workflows/
    │   └── deploy.yml               # GitHub Actions — auto-deploy to Pages
    ├── public/
    │   └── municipalities.geojson   # Served at runtime for map rendering
    └── src/
        ├── components/
        │   ├── LandingPage.jsx
        │   ├── MapView.jsx
        │   ├── RankList.jsx
        │   ├── DetailPanel.jsx
        │   ├── WeightsPanel.jsx
        │   └── ComparePanel.jsx
        ├── utils/
        │   └── score.js             # Client-side score recalculation (weights panel)
        └── data/
            └── lazio_neighborhoods.json
```

---

## Data Pipeline — How It Works

1. **Load boundaries** — ISTAT comuni 2025 shapefile filtered to 4 regions (~1,050 communes)
2. **Seismic hazard** — DPC national classification CSV → zone 1/2/3/4 → score 100/66/33/0
3. **Flood & landslide** — ISPRA PIR CSV → % population and area exposed at P3/P4 → composite index
4. **Vulnerability** — ISPRA PIR (ISTAT 2021 base) → elderly share (>64) and youth share → weighted index
5. **Wildfire exposure** — EFFIS MODIS shapefile → spatial join to comuni → cumulative burned ha 2016–2026 (cached)
6. **Emergency coverage** — OpenStreetMap Overpass API → hospital count per comune → per-capita, inverted (cached)
7. **Score computation** — min-max normalise each indicator → weighted composite Priority Score
8. **Export** — `municipalities.geojson` + `lazio_neighborhoods.json` → auto-synced to React app

---

## Deployment

The app deploys automatically to GitHub Pages on every push to `main` via GitHub Actions.

**What gets committed:**
- `data/processed/` — pre-processed outputs (JSON, GeoJSON, CSV caches) — **small, committed**
- `risk-prospect/src/data/` and `risk-prospect/public/` — data files synced by the pipeline

**What does NOT get committed (too large):**
- `data/raw/` — all source datasets (shapefile, CSVs, EFFIS polygons) are excluded via `.gitignore`

This means the processed data files in `data/processed/` must be committed after each pipeline run before pushing.

---

## Data & Security

- No personal data collected · no user accounts · no API keys in client code
- All source data is open and public: DPC, ISPRA, EFFIS/Copernicus, ISTAT, OpenStreetMap
- Raw datasets (several GB total) are excluded from the repository
- Contact form submissions go to a private Google Sheet via Apps Script

---

*RiskWatch Italia is a portfolio-stage analytical tool built on open public data. Not intended as operational emergency management advice.*
