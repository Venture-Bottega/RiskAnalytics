import { useState } from 'react'

export default function LandingPage({ onEnter }) {
    const [form, setForm] = useState({ name: '', email: '', organisation: '', message: '' })
    const [status, setStatus] = useState(null)

    function handleChange(e) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwzlX-XyNnNZC3QqrlloOj4VTnjvLtMXJOEC3p5rgjkktNly0xOwj2ashNtBBFS7jiU/exec'

    async function handleSubmit() {
        if (!form.name || !form.email) { setStatus('error'); return }
        setStatus('sending')
        try {
            await fetch(SHEETS_URL, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timestamp: new Date().toISOString(), ...form }),
            })
            setForm({ name: '', email: '', organisation: '', message: '' })
            setStatus('sent')
        } catch { setStatus('error') }
    }

    const inputStyle = {
        width: '100%', padding: '12px 16px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '4px', color: '#ede8e6',
        fontSize: '14px', boxSizing: 'border-box',
        outline: 'none', fontFamily: 'inherit',
    }
    const labelStyle = {
        fontSize: '11px', letterSpacing: '0.15em',
        textTransform: 'uppercase', color: '#9a7a74', marginBottom: '8px', display: 'block',
    }
    const accent = '#e8633a'
    const accentDim = '#9a4020'

    return (
        <div style={{ minHeight: '100vh', background: '#120e0d', color: '#ede8e6', fontFamily: "'Georgia', 'Times New Roman', serif", overflowX: 'hidden' }}>

            {/* Nav */}
            <nav style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '24px 48px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                position: 'sticky', top: 0, background: '#120e0d', zIndex: 100,
            }}>
                <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: accent }}>
                    ⚠ RiskWatch Italia
                </div>
                <button onClick={onEnter} style={{
                    background: accent, color: '#fff', border: 'none',
                    padding: '10px 24px', borderRadius: '4px', fontWeight: 700,
                    fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                }}>Open Map →</button>
            </nav>

            {/* Hero */}
            <section style={{ padding: '100px 48px 80px', maxWidth: '900px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: accent, marginBottom: '24px' }}>
                    Civil Protection Risk Intelligence · Italy
                </div>
                <h1 style={{ fontSize: 'clamp(42px, 6vw, 80px)', fontWeight: 400, lineHeight: 1.05, margin: '0 0 32px', color: '#f4eeeb', fontStyle: 'italic' }}>
                    Which municipalities<br />need attention most?
                </h1>
                <p style={{ fontSize: '18px', lineHeight: 1.7, color: '#b8a8a2', maxWidth: '580px', margin: '0 0 48px' }}>
                    RiskWatch Italia is a multi-hazard screening tool that ranks Italian municipalities
                    by civil protection priority — integrating seismic, flood, wildfire, and population vulnerability data.
                </p>
                <button onClick={onEnter} style={{
                    background: 'transparent', color: accent,
                    border: `1.5px solid ${accent}`, padding: '14px 36px',
                    borderRadius: '4px', fontSize: '14px', fontWeight: 600,
                    letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                }}>Explore the Risk Map</button>
            </section>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 48px' }} />

            {/* What is the score */}
            <section style={{ padding: '80px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', maxWidth: '1100px' }}>
                <div>
                    <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: accent, marginBottom: '20px' }}>The Score</div>
                    <h2 style={{ fontSize: '32px', fontWeight: 400, margin: '0 0 20px', lineHeight: 1.2, fontStyle: 'italic' }}>
                        What is the Priority Score?
                    </h2>
                    <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#b8a8a2', margin: '0 0 20px' }}>
                        A composite 0–100 index derived from official Italian civil protection datasets,
                        designed to surface municipalities with the highest multi-hazard emergency risk exposure.
                    </p>
                    <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#b8a8a2' }}>
                        High score = high priority. Each component is independently normalised so no single
                        hazard dominates — seismic zones, flood plains, wildfire history, vulnerable populations,
                        and emergency infrastructure gaps all contribute.
                    </p>
                </div>
                <div style={{ background: `rgba(232,99,58,0.06)`, border: `1px solid rgba(232,99,58,0.15)`, borderRadius: '8px', padding: '36px' }}>
                    <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: '24px' }}>Formula</div>
                    {[
                        { weight: '25%', label: 'Seismic Hazard',         note: 'Zone 1–4 · Protezione Civile 2025',        color: '#c0392b' },
                        { weight: '30%', label: 'Flood / Landslide Risk', note: '% population & area exposed · ISPRA 2024', color: '#2980b9' },
                        { weight: '15%', label: 'Wildfire Exposure',      note: 'Burned area 2016–2026 · EFFIS MODIS',      color: '#e67e22' },
                        { weight: '20%', label: 'Population Vulnerability',note: 'Elderly share >64 · ISTAT Census 2021',   color: '#8e44ad' },
                        { weight: '10%', label: 'Emergency Coverage',     note: 'Hospital density · OpenStreetMap',         color: '#27ae60' },
                    ].map(({ weight, label, note, color }) => (
                        <div key={label} style={{ display: 'flex', gap: '16px', marginBottom: '18px', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '18px', fontWeight: 700, color, minWidth: '44px', fontStyle: 'italic' }}>{weight}</div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#ede8e6', marginBottom: '3px' }}>{label}</div>
                                <div style={{ fontSize: '12px', color: '#7a6a64' }}>{note}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 48px' }} />

            {/* Who it's for */}
            <section style={{ padding: '80px 48px', maxWidth: '1100px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: accent, marginBottom: '20px' }}>Who It's For</div>
                <h2 style={{ fontSize: '32px', fontWeight: 400, margin: '0 0 48px', fontStyle: 'italic' }}>Built for civil protection professionals</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
                    {[
                        { title: 'Regional Authorities', body: 'Screen 1,000+ municipalities in seconds. Focus prevention resources and emergency planning where structural multi-hazard signals converge.' },
                        { title: 'Civil Protection Agencies', body: 'Identify high-priority areas before events occur. The priority score integrates seismic, flood, wildfire and demographic vulnerability — not just one hazard.' },
                        { title: 'Researchers & Planners', body: 'Combine and adjust indicator weights to reflect your specific risk model. Export ranked lists to brief decision-makers with evidence-based data.' },
                    ].map(({ title, body }) => (
                        <div key={title} style={{ borderTop: `1px solid rgba(232,99,58,0.25)`, paddingTop: '24px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#ede8e6' }}>{title}</div>
                            <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#7a6a64', margin: 0 }}>{body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 48px' }} />

            {/* Methodology */}
            <section style={{ padding: '80px 48px', maxWidth: '1100px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: accent, marginBottom: '20px' }}>Methodology</div>
                <h2 style={{ fontSize: '32px', fontWeight: 400, margin: '0 0 40px', fontStyle: 'italic' }}>Open data, reproducible science</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
                    <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent, marginBottom: '16px' }}>Data Sources</h3>
                        {[
                            ['Protezione Civile', 'Classificazione Sismica Comuni Italiani — May 2025 update · zones 1–4'],
                            ['ISPRA', 'Piano Indicatori di Rischio (PIR) · Flood (2020) & Landslide (2024) · population & area exposure'],
                            ['EFFIS', 'MODIS Burned Area polygons 2016–2026 · European Forest Fire Information System'],
                            ['ISTAT Census 2021', 'Population age structure by comune — from ISPRA PIR microdata'],
                            ['OpenStreetMap', 'Hospital locations per comune · Overpass API · counts cached'],
                            ['ISTAT Boundaries', 'Comuni 2025 · WGS84 · simplified at 0.001° for web delivery'],
                        ].map(([source, desc]) => (
                            <div key={source} style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ede8e6', marginBottom: '4px' }}>{source}</div>
                                <div style={{ fontSize: '12px', color: '#7a6a64', lineHeight: 1.6 }}>{desc}</div>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent, marginBottom: '16px' }}>Important Caveats</h3>
                        <ul style={{ padding: '0 0 0 16px', margin: 0, color: '#7a6a64', fontSize: '13px', lineHeight: 2 }}>
                            <li>Priority Score is a screening index, not an official risk classification</li>
                            <li>Flood/landslide data uses ISPRA 2020 hydraulic hazard maps (2024 boundaries)</li>
                            <li>Wildfire area is the total EFFIS MODIS burned area 2016–2026 per comune</li>
                            <li>Study area: Lazio, Toscana, Umbria, Abruzzo · ~1,048 municipalities</li>
                            <li>Hospital counts from OSM may undercount smaller clinics or first-aid posts</li>
                        </ul>
                    </div>
                </div>
            </section>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 48px' }} />

            {/* Contact */}
            <section style={{ padding: '80px 48px', maxWidth: '680px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: accent, marginBottom: '20px' }}>Contact</div>
                <h2 style={{ fontSize: '32px', fontWeight: 400, margin: '0 0 20px', fontStyle: 'italic' }}>Request access or a demo</h2>
                <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#b8a8a2', margin: '0 0 40px' }}>
                    RiskWatch Italia is in active development. Reach out to discuss access, custom coverage areas,
                    or integration with your existing civil protection workflow.
                </p>

                {status === 'sent' ? (
                    <div style={{ background: `rgba(232,99,58,0.1)`, border: `1px solid rgba(232,99,58,0.3)`, borderRadius: '6px', padding: '24px', color: accent, fontSize: '15px' }}>
                        ✓ Message received — we'll be in touch shortly.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[
                            { key: 'name',         label: 'Name',         placeholder: 'Your name',       type: 'text' },
                            { key: 'email',        label: 'Email',        placeholder: 'your@email.com',  type: 'email' },
                            { key: 'organisation', label: 'Organisation', placeholder: 'Agency / institution', type: 'text' },
                        ].map(({ key, label, placeholder, type }) => (
                            <div key={key}>
                                <label style={labelStyle}>{label}</label>
                                <input type={type} name={key} value={form[key]} onChange={handleChange} placeholder={placeholder} style={inputStyle} />
                            </div>
                        ))}
                        <div>
                            <label style={labelStyle}>Message</label>
                            <textarea name="message" value={form.message} onChange={handleChange} placeholder="What are you looking for?" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                        </div>
                        {status === 'error' && <div style={{ color: '#e07070', fontSize: '13px' }}>Please fill in at least your name and email.</div>}
                        <button
                            onClick={handleSubmit} disabled={status === 'sending'}
                            style={{
                                background: accent, color: '#fff', border: 'none',
                                padding: '14px 32px', borderRadius: '4px', fontWeight: 700,
                                fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase',
                                cursor: 'pointer', alignSelf: 'flex-start',
                                opacity: status === 'sending' ? 0.6 : 1,
                            }}
                        >{status === 'sending' ? 'Saving…' : 'Send Message'}</button>
                    </div>
                )}
            </section>

            {/* Footer */}
            <footer style={{
                padding: '32px 48px', borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                color: '#5a4a44', fontSize: '12px',
            }}>
                <div>RiskWatch Italia · Central Italy</div>
                <div>Protezione Civile · ISPRA · EFFIS · ISTAT · OpenStreetMap</div>
            </footer>
        </div>
    )
}
