// CARTO basemap configuration.
//
// The key is public by design — it travels in every tile URL, so it cannot be
// hidden. It is scoped to our domains instead, which is how basemap keys are
// protected. Do not treat it like a secret, and do not reuse it elsewhere:
// it is issued per project.
//
// Free up to 5M tile requests/month, in exchange for keeping the CARTO and
// OpenStreetMap attribution visible. See https://carto.com/attributions
const CARTO_KEY = 'cb1_2urm_1_b8bbf5f2e2676470c093c093'

/** Attribution required by the CARTO free tier. Must stay visible on the map. */
export const BASEMAP_ATTRIBUTION =
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>'

/** Build a CARTO raster tile URL for a given style, with the key appended. */
export function cartoTiles(style) {
    return `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`
}
