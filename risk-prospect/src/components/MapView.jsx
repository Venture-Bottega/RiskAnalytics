import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import neighborhoods from '../data/lazio_neighborhoods.json'

const dataMap = Object.fromEntries(neighborhoods.map(n => [n.id, n]))

// High score = high risk → red; low score = low risk → green
function scoreToColor(score, min, max) {
    const t = Math.max(0, Math.min(1, (score - min) / (max - min || 1)))
    // green (low risk) → amber → red (high risk)
    if (t < 0.33) {
        const t2 = t / 0.33
        return `rgb(${Math.round(34+(220-34)*t2)},${Math.round(139+(160-139)*t2)},${Math.round(34+(30-34)*t2)})`
    } else if (t < 0.66) {
        const t2 = (t - 0.33) / 0.33
        return `rgb(${Math.round(220+(230-220)*t2)},${Math.round(160+(100-160)*t2)},${Math.round(30+(20-30)*t2)})`
    } else {
        const t2 = (t - 0.66) / 0.34
        return `rgb(${Math.round(230+(192-230)*t2)},${Math.round(100+(57-100)*t2)},${Math.round(20+(43-20)*t2)})`
    }
}

export default function MapView({ neighborhoods: data, selectedId, compareIds = new Set(), weights, onSelect, sidebarOpen = true }) {
    const mapRef        = useRef(null)
    const mapInstanceRef = useRef(null)
    const layersRef     = useRef({})
    const scoreMapRef   = useRef({})  // id → current score

    // Build score lookup from data prop
    const scores = data.map(n => n.prospectScore)
    const DATA_MIN = Math.min(...scores)
    const DATA_MAX = Math.max(...scores)
    data.forEach(n => { scoreMapRef.current[n.id] = n.prospectScore })

    useEffect(() => {
        if (mapInstanceRef.current) return

        const map = L.map(mapRef.current, {
            center: [41.9, 12.9], zoom: 8,
            zoomControl: true, attributionControl: true,
        })

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd', maxZoom: 19,
        }).addTo(map)

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
            attribution: '', subdomains: 'abcd', maxZoom: 19, pane: 'overlayPane',
        }).addTo(map)

        mapInstanceRef.current = map

        fetch(`${import.meta.env.BASE_URL}municipalities.geojson`)
            .then(r => r.json())
            .then(geojson => {
                L.geoJSON(geojson, {
                    style: (feature) => {
                        const id    = feature.properties.id
                        const score = scoreMapRef.current[id] ?? ((DATA_MIN + DATA_MAX) / 2)
                        return {
                            fillColor: scoreToColor(score, DATA_MIN, DATA_MAX),
                            fillOpacity: 0.78, color: '#ffffff', weight: 0.7, opacity: 0.9,
                        }
                    },
                    onEachFeature: (feature, layer) => {
                        const id    = feature.properties.id
                        const entry = dataMap[id]
                        layersRef.current[id] = layer

                        const name  = feature.properties.name
                        const ind0  = entry?.indicators?.[0]  // seismic
                        const ind1  = entry?.indicators?.[1]  // flood
                        const ind2  = entry?.indicators?.[2]  // wildfire
                        const zone  = entry?.infrastructure?.seismic_zone ?? '–'

                        layer.bindTooltip(
                            `<strong>${name}</strong><br/>` +
                            `Priority Score: <b>${(scoreMapRef.current[id] ?? 0).toFixed(1)}</b><br/>` +
                            `Seismic Zone: ${zone}` +
                            (ind1?.value != null ? `<br/>Flood/Landslide index: ${ind1.value.toFixed(1)}` : '') +
                            (ind2?.value != null ? `<br/>Wildfire: ${ind2.value.toFixed(0)} ha` : ''),
                            { sticky: true }
                        )

                        layer.on('click', () => {
                            const neighborhood = data.find(n => n.id === id)
                            if (neighborhood) onSelect(neighborhood)
                        })
                        layer.on('mouseover', function () {
                            if (id !== selectedId) this.setStyle({ fillOpacity: 0.95, weight: 2 })
                        })
                        layer.on('mouseout', function () {
                            if (id !== selectedId && !compareIds.has(id))
                                this.setStyle({ fillOpacity: 0.78, weight: 0.7 })
                        })
                    },
                }).addTo(map)
            })
    }, [])

    // Recolor map when scores change (weights updated)
    useEffect(() => {
        const scores = data.map(n => n.prospectScore)
        const min = Math.min(...scores)
        const max = Math.max(...scores)
        Object.entries(layersRef.current).forEach(([id, layer]) => {
            const score = data.find(n => n.id === id)?.prospectScore ?? ((min + max) / 2)
            scoreMapRef.current[id] = score
            if (id !== selectedId && !compareIds.has(id)) {
                layer.setStyle({ fillColor: scoreToColor(score, min, max) })
            }
        })
    }, [data])

    // Highlight selected + compare
    useEffect(() => {
        Object.entries(layersRef.current).forEach(([id, layer]) => {
            if (id === selectedId) {
                layer.setStyle({ fillOpacity: 0.97, weight: 2.5, color: '#1e2a4a' })
                layer.bringToFront()
            } else if (compareIds.has(id)) {
                layer.setStyle({ fillOpacity: 0.97, weight: 2.5, color: '#7ab4e8' })
                layer.bringToFront()
            } else {
                layer.setStyle({ fillOpacity: 0.78, weight: 0.7, color: '#ffffff' })
            }
        })
    }, [selectedId, compareIds])

    const minScore = Math.min(...data.map(n => n.prospectScore))
    const maxScore = Math.max(...data.map(n => n.prospectScore))

    return (
        <>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            <div className="map-legend" style={{ left: sidebarOpen ? "calc(var(--rank-width) + 16px)" : "16px" }}>
                <div className="map-legend__title">Priority Score</div>
                <div className="map-legend__bar" />
                <div className="map-legend__labels">
                    <span style={{color:'#22a355'}}>Low Risk {minScore.toFixed(0)}</span>
                    <span style={{color:'#c0392b'}}>High Risk {maxScore.toFixed(0)}</span>
                </div>
            </div>
            <div className={`map-hint${selectedId ? ' hidden' : ''}`}>
                Click a comune to explore
            </div>
        </>
    )
}
