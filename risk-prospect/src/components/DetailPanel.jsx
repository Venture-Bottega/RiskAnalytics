import { useState } from 'react'

function Collapsible({ label, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="detail-section">
            <button
                onClick={() => setOpen(p => !p)}
                style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', width: '100%',
                    background: 'none', border: 'none', padding: 0,
                    cursor: 'pointer', marginBottom: open ? '10px' : 0,
                }}
            >
                <span className="detail-section__label" style={{ marginBottom: 0 }}>{label}</span>
                <span style={{ fontSize: '9px', color: 'var(--color-text-tertiary)' }}>{open ? '▲' : '▼'}</span>
            </button>
            {open && children}
        </div>
    )
}

const RISK_LEVELS = [
    { threshold: 75, label: 'Critical Priority', bg: '#fde8e6', color: '#c0392b', border: '#e8a09a' },
    { threshold: 50, label: 'High Priority',     bg: '#fef3e2', color: '#d35400', border: '#f0c070' },
    { threshold: 25, label: 'Medium Priority',   bg: '#fefae0', color: '#b7950b', border: '#e8d870' },
    { threshold: 0,  label: 'Lower Priority',    bg: '#eafaf1', color: '#1e8449', border: '#82c9a0' },
]

function getRiskLevel(score, min, max) {
    const t = max > min ? ((score - min) / (max - min)) * 100 : 50
    return RISK_LEVELS.find(r => t >= r.threshold) ?? RISK_LEVELS[RISK_LEVELS.length - 1]
}

function scoreColor(score, min, max) {
    const t = max > min ? (score - min) / (max - min) : 0.5
    if (t >= 0.66) return '#c0392b'
    if (t >= 0.33) return '#d35400'
    return '#1e8449'
}

const ZONE_DESCRIPTIONS = {
    '1':  'Zone 1 — Very High seismicity',
    '2':  'Zone 2 — High seismicity',
    '3':  'Zone 3 — Medium seismicity',
    '3S': 'Zone 3S — Medium seismicity (special)',
    '4':  'Zone 4 — Low seismicity',
}

export default function DetailPanel({ neighborhood, onClose, onAbout, onCompare }) {
    const isOpen = !!neighborhood

    return (
        <div className={`detail-panel${isOpen ? ' open' : ''}`} aria-label="Comune detail">
            <button className="detail-panel__close" onClick={onClose} aria-label="Close panel">×</button>

            {neighborhood && (
                <>
                    {/* Hero */}
                    <div className="detail-panel__hero">
                        <div className="detail-panel__tag">Comune · {neighborhood.region}</div>
                        <div className="detail-panel__name">{neighborhood.name}</div>

                        {/* Risk badge */}
                        {(() => {
                            const lvl = getRiskLevel(neighborhood.prospectScore, neighborhood.scoreMin, neighborhood.scoreMax)
                            return (
                                <span style={{
                                    display: 'inline-block', fontSize: '11px', fontWeight: 700,
                                    color: lvl.color, background: lvl.bg,
                                    border: `1px solid ${lvl.border}`,
                                    borderRadius: '4px', padding: '2px 10px', marginBottom: '12px',
                                }}>⚠ {lvl.label}</span>
                            )
                        })()}

                        <div className="detail-panel__score-row">
                            <span
                                className="detail-panel__score-num"
                                style={{ color: scoreColor(neighborhood.prospectScore, neighborhood.scoreMin, neighborhood.scoreMax) }}
                            >
                                {neighborhood.prospectScore.toFixed(1)}
                            </span>
                            <span className="detail-panel__score-denom">/ 100</span>
                        </div>
                        <div className="detail-panel__score-label">Civil Protection Priority Score</div>
                    </div>

                    <div className="detail-panel__body">

                        {/* Risk Summary */}
                        <div className="detail-section">
                            <div className="detail-section__label">Risk Summary</div>
                            <p className="detail-section__explanation">{neighborhood.explanation}</p>
                        </div>

                        {/* Indicator Breakdown */}
                        <div className="detail-section">
                            <div className="detail-section__label">Indicator Breakdown</div>
                            <div className="indicator-list">
                                {neighborhood.indicators.map(ind => (
                                    <div key={ind.key} className="indicator-item">
                                        <div className="indicator-item__label-row">
                                            <span className="indicator-item__name">{ind.label}</span>
                                            <span className="indicator-item__value">
                                                {ind.value != null ? `${ind.value}${ind.unit}` : '—'}
                                                <span style={{ fontWeight: 400, color: '#9b9895', marginLeft: 6, fontSize: 10 }}>
                                                    {ind.note}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="indicator-item__track">
                                            <div
                                                className="indicator-item__fill"
                                                style={{ width: `${Math.min(100, Math.abs(ind.score ?? 0))}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Seismic Profile */}
                        {neighborhood.infrastructure?.seismic_zone && (
                            <div className="detail-section">
                                <div className="detail-section__label">Seismic Profile</div>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                                    {ZONE_DESCRIPTIONS[neighborhood.infrastructure.seismic_zone] ?? `Zone ${neighborhood.infrastructure.seismic_zone}`}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                                    Source: Protezione Civile — Classificazione Sismica 2025
                                </div>
                            </div>
                        )}

                        {/* Emergency Infrastructure */}
                        <div className="detail-section">
                            <div className="detail-section__label">Emergency Infrastructure</div>
                            {neighborhood.infrastructure ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {[
                                        { label: 'Hospitals', value: neighborhood.infrastructure.hospitals, icon: '🏥' },
                                        { label: 'Wildfire Area', value: `${neighborhood.infrastructure.wildfire_ha ?? 0} ha`, icon: '🔥' },
                                    ].map(({ label, value, icon }) => (
                                        <div key={label} style={{
                                            background: 'var(--color-surface-muted)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '6px', padding: '10px 8px', textAlign: 'center',
                                        }}>
                                            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{value}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="detail-section__explanation" style={{ color: 'var(--color-text-tertiary)' }}>No data.</p>
                            )}
                        </div>

                        {/* Score Breakdown */}
                        <Collapsible label="Score Breakdown">
                            <p className="detail-section__explanation" style={{ fontSize: '12px' }}>
                                <strong>Civil Protection Priority Score</strong><br />
                                25% × Seismic Hazard (zone class)<br />
                                + 30% × Flood / Landslide Risk (ISPRA)<br />
                                + 15% × Wildfire Exposure (EFFIS)<br />
                                + 20% × Population Vulnerability (elderly share)<br />
                                + 10% × Emergency Coverage (hospital density, inverted)<br /><br />
                                Each component is independently min-max normalised to [0–100].
                                High score = high civil protection priority.
                            </p>
                        </Collapsible>

                        {/* Data Sources */}
                        <Collapsible label="Data Sources">
                            <p className="detail-section__explanation" style={{ fontSize: '11px' }}>
                                Seismic classification — Protezione Civile, May 2025.<br />
                                Flood & landslide — ISPRA Piano Indicatori di Rischio (PIR) 2020/2024.<br />
                                Wildfire — EFFIS MODIS Burned Area 2016–2026, European Forest Fire Information System.<br />
                                Population vulnerability — ISTAT Census 2021 (age brackets from ISPRA PIR).<br />
                                Hospitals — OpenStreetMap via Overpass API.<br />
                                Boundaries — ISTAT Comuni 2025, WGS84.
                            </p>
                        </Collapsible>

                        {/* Actions */}
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                onClick={() => onCompare && onCompare(neighborhood)}
                                style={{
                                    width: '100%', padding: '10px', background: 'none',
                                    border: '1.5px solid #7ab4e8', borderRadius: '6px',
                                    color: '#7ab4e8', fontWeight: 600, fontSize: '12px',
                                    letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                                }}
                            >⇄ Add to Compare</button>
                            <button
                                onClick={onAbout}
                                style={{
                                    width: '100%', padding: '10px', background: 'none',
                                    border: '1.5px solid var(--color-accent)', borderRadius: '6px',
                                    color: 'var(--color-accent)', fontWeight: 600, fontSize: '12px',
                                    letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                                }}
                            >About RiskWatch →</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
