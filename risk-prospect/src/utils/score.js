// src/utils/score.js
export const DEFAULT_WEIGHTS = {
    seismic:  25,
    flood:    30,
    wildfire: 15,
    vuln:     20,
    infra:    10,
}

export function computeScore(neighborhood, weights) {
    const indicators = neighborhood.indicators || []
    const get = key => {
        const ind = indicators.find(i => i.key === key)
        return ind?.score ?? 0
    }
    const seismic  = get('seismicHazard')
    const flood    = get('floodLandslide')
    const wildfire = get('wildfireExposure')
    const vuln     = get('populationVulnerability')
    const infra    = get('emergencyCoverage')

    return (
        (weights.seismic  / 100) * seismic  +
        (weights.flood    / 100) * flood    +
        (weights.wildfire / 100) * wildfire +
        (weights.vuln     / 100) * vuln     +
        (weights.infra    / 100) * infra
    )
}
