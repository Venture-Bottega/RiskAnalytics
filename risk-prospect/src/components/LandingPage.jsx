import { useState, useEffect, useRef } from 'react'

/* ── Scroll-reveal hook ── */
function useReveal() {
    const ref = useRef(null)
    const [visible, setVisible] = useState(false)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
            { threshold: 0.12 }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [])
    return [ref, visible]
}

function RevealSection({ children, delay = 0, className = '' }) {
    const [ref, visible] = useReveal()
    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(32px)',
                transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
            }}
        >
            {children}
        </div>
    )
}

export default function LandingPage({ onEnter }) {
    const [form, setForm] = useState({ name: '', email: '', organisation: '', message: '' })
    const [status, setStatus] = useState(null)
    const [heroIn, setHeroIn] = useState(false)

    useEffect(() => {
        const t = setTimeout(() => setHeroIn(true), 60)
        return () => clearTimeout(t)
    }, [])

    function handleChange(e) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwzlX-XyNnNZC3QqrlloOj4VTnjvLtMXJOEC3p5rgjkktNly0xOwj2ashNtBBFS7jiU/exec'

    async function handleSubmit() {
        if (!form.name || !form.email) { setStatus('error'); return }
        setStatus('sending')
        try {
            await fetch(SHEETS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timestamp: new Date().toISOString(), ...form }),
            })
            setForm({ name: '', email: '', organisation: '', message: '' })
            setStatus('sent')
        } catch { setStatus('error') }
    }

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        color: '#ede8e6',
        fontSize: '14px',
        boxSizing: 'border-box',
        outline: 'none',
        fontFamily: 'inherit',
        transition: 'border-color 0.2s ease',
    }
    const labelStyle = {
        fontSize: '11px',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: '#9a7a74',
        marginBottom: '8px',
        display: 'block',
    }

    const accent = '#e05645'
    const accentHover = '#cf4939'

    const PORTAL_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:5173' 
        : 'https://urban-prospect-81u8.vercel.app';

    return (
        <div style={{ minHeight: '100vh', background: '#120e0d', color: '#ede8e6', fontFamily: "'Georgia', 'Times New Roman', serif", overflowX: 'hidden', position: 'relative' }}>

            {/* ── Animated grid background ── */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                backgroundImage: `linear-gradient(rgba(224,86,69,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(224,86,69,0.03) 1px, transparent 1px)`,
                backgroundSize: '48px 48px',
                animation: 'landingGridDrift 24s linear infinite',
            }} />

            {/* ── Radial glow top-left ── */}
            <div style={{
                position: 'fixed', top: '-10%', left: '-5%', width: '600px', height: '600px',
                background: 'radial-gradient(circle, rgba(224,86,69,0.05) 0%, transparent 65%)',
                pointerEvents: 'none', zIndex: 0,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>

                {/* ── Nav ── */}
                <nav style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '24px 48px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    position: 'sticky', top: 0, zIndex: 100,
                    background: 'rgba(18,14,13,0.85)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    opacity: heroIn ? 1 : 0,
                    transform: heroIn ? 'translateY(0)' : 'translateY(-12px)',
                    transition: 'opacity 0.5s ease, transform 0.5s ease',
                }}>
                    <div 
                        onClick={() => window.location.href = PORTAL_URL}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                        title="Back to Suite Portal"
                    >
                        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="6" fill="rgba(224, 86, 69, 0.12)" />
                            <path d="M8 22 L16 10 L24 22" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M11 18 L16 10 L21 18" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="rgba(224, 86, 69, 0.12)" />
                            <circle cx="16" cy="10" r="2" fill={accent} />
                        </svg>
                        <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: accent, fontFamily: "'Inter', sans-serif" }}>
                            RiskWatch Italia
                        </span>
                        <span style={{ 
                            fontSize: '11px', color: '#9a7a74', fontFamily: "'Inter', sans-serif", 
                            marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)',
                            letterSpacing: '0.05em' 
                        }}>
                            ← Sibling Portal
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={onEnter} style={{
                            background: accent, color: '#ffffff', border: 'none',
                            padding: '10px 24px', borderRadius: '6px', fontWeight: 700,
                            fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase',
                            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                            transition: 'background 0.2s ease, transform 0.15s ease',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = accentHover}
                            onMouseLeave={e => e.currentTarget.style.background = accent}
                        >
                            Open Map →
                        </button>
                    </div>
                </nav>

                {/* ── Hero ── */}
                <section style={{ padding: '110px 48px 90px', maxWidth: '960px' }}>
                    <div style={{
                        fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase',
                        color: accent, marginBottom: '28px', fontFamily: "'Inter', sans-serif",
                        opacity: heroIn ? 1 : 0, transform: heroIn ? 'translateY(0)' : 'translateY(16px)',
                        transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
                    }}>
                        Civil Protection Risk Intelligence · Italy
                    </div>
                    <h1 style={{
                        fontSize: 'clamp(44px, 6vw, 82px)', fontWeight: 400, lineHeight: 1.04,
                        margin: '0 0 32px', color: '#f4eeeb', fontStyle: 'italic',
                        opacity: heroIn ? 1 : 0, transform: heroIn ? 'translateY(0)' : 'translateY(20px)',
                        transition: 'opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s',
                    }}>
                        Which municipalities<br />need attention most?
                    </h1>
                    <p style={{
                        fontSize: '18px', lineHeight: 1.75, color: '#b8a8a2',
                        maxWidth: '560px', margin: '0 0 52px',
                        fontFamily: "'Inter', sans-serif", fontStyle: 'normal',
                        opacity: heroIn ? 1 : 0, transform: heroIn ? 'translateY(0)' : 'translateY(20px)',
                        transition: 'opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s',
                    }}>
                        RiskWatch Italia is a multi-hazard screening tool that ranks Italian municipalities
                        by civil protection priority — integrating seismic, flood, wildfire, and population vulnerability data.
                    </p>
                    <div style={{
                        display: 'flex', gap: '16px', flexWrap: 'wrap',
                        opacity: heroIn ? 1 : 0, transform: heroIn ? 'translateY(0)' : 'translateY(20px)',
                        transition: 'opacity 0.7s ease 0.4s, transform 0.7s ease 0.4s',
                    }}>
                        <button onClick={onEnter} style={{
                            background: 'transparent', color: accent,
                            border: `1.5px solid ${accent}`, padding: '14px 36px',
                            borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                            transition: 'background 0.2s ease, color 0.2s ease',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,86,69,0.1)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                            Explore the Risk Map
                        </button>
                        <a href="#contact" style={{
                            background: 'transparent', color: '#9a7a74',
                            border: '1.5px solid rgba(255,255,255,0.1)', padding: '14px 36px',
                            borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                            textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                            transition: 'border-color 0.2s ease, color 0.2s ease',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#ede8e6' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#9a7a74' }}
                        >
                            Request Access
                        </a>
                    </div>
                </section>

                {/* ── Stats strip ── */}
                <RevealSection>
                    <div style={{
                        margin: '0 48px 80px',
                        background: 'rgba(224, 86, 69, 0.04)',
                        border: '1px solid rgba(224, 86, 69, 0.12)',
                        borderRadius: '12px',
                        padding: '36px 48px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '32px',
                    }}>
                        {[
                            { num: '1,048', label: 'Municipalities screened' },
                            { num: '4', label: 'Central Italy regions' },
                            { num: 'Multi-Hazard', label: 'Indices evaluated' },
                            { num: '5', label: 'Independent data sources' },
                        ].map(({ num, label }) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', fontWeight: 700, color: accent, fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}>{num}</div>
                                <div style={{ fontSize: '11px', color: '#9a7a74', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '6px', fontFamily: "'Inter', sans-serif" }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </RevealSection>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 48px' }} />

                {/* ── Score section ── */}
                <section style={{ padding: '90px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', maxWidth: '1140px' }}>
                    <RevealSection>
                        <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: accent, marginBottom: '20px', fontFamily: "'Inter', sans-serif" }}>The Score</div>
                        <h2 style={{ fontSize: '34px', fontWeight: 400, margin: '0 0 24px', lineHeight: 1.2, fontStyle: 'italic' }}>
                            What is the Priority Score?
                        </h2>
                        <p style={{ fontSize: '15px', lineHeight: 1.85, color: '#b8a8a2', margin: '0 0 20px', fontFamily: "'Inter', sans-serif", fontStyle: 'normal' }}>
                            A composite 0–100 index derived from official Italian civil protection datasets,
                            designed to surface municipalities with the highest multi-hazard emergency risk exposure.
                        </p>
                        <p style={{ fontSize: '15px', lineHeight: 1.85, color: '#9a7a74', margin: 0, fontFamily: "'Inter', sans-serif", fontStyle: 'normal' }}>
                            High score = high priority. Each component is independently normalised so no single hazard dominates — seismic zones, flood plains, wildfire history, vulnerable populations, and emergency infrastructure gaps all contribute.
                        </p>
                    </RevealSection>

                    <RevealSection delay={0.12}>
                        <div style={{
                            background: 'rgba(224, 86, 69, 0.04)',
                            border: '1px solid rgba(224, 86, 69, 0.14)',
                            borderRadius: '12px',
                            padding: '36px',
                        }}>
                            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: '28px', fontFamily: "'Inter', sans-serif" }}>Formula</div>
                            {[
                                { weight: '25%', label: 'Seismic Hazard', note: 'Zone 1–4 · Protezione Civile 2025' },
                                { weight: '30%', label: 'Flood / Landslide Risk', note: '% population & area exposed · ISPRA 2024' },
                                { weight: '15%', label: 'Wildfire Exposure', note: 'Burned area 2016–2026 · EFFIS MODIS' },
                                { weight: '20%', label: 'Population Vulnerability', note: 'Elderly share >64 · ISTAT Census 2021' },
                                { weight: '10%', label: 'Emergency Coverage', note: 'Hospital density · OpenStreetMap' },
                            ].map(({ weight, label, note }, i) => (
                                <div key={label} style={{
                                    display: 'flex', gap: '16px', marginBottom: i < 4 ? '24px' : 0,
                                    alignItems: 'flex-start',
                                    paddingBottom: i < 4 ? '24px' : 0,
                                    borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                }}>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: accent, minWidth: '44px', fontStyle: 'italic', fontFamily: "'Georgia', serif" }}>{weight}</div>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#ede8e6', marginBottom: '3px', fontFamily: "'Inter', sans-serif" }}>{label}</div>
                                        <div style={{ fontSize: '12px', color: '#9a7a74', fontFamily: "'Inter', sans-serif" }}>{note}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </RevealSection>
                </section>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 48px' }} />

                {/* ── Who it's for ── */}
                <section style={{ padding: '90px 48px', maxWidth: '1140px' }}>
                    <RevealSection>
                        <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: accent, marginBottom: '20px', fontFamily: "'Inter', sans-serif" }}>Who It's For</div>
                        <h2 style={{ fontSize: '34px', fontWeight: 400, margin: '0 0 56px', fontStyle: 'italic' }}>Built for civil protection professionals</h2>
                    </RevealSection>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                        {[
                            { title: 'Regional Authorities', body: 'Screen 1,000+ municipalities in seconds. Focus prevention resources and emergency planning where structural multi-hazard signals converge.', icon: '◈' },
                            { title: 'Civil Protection Agencies', body: 'Identify high-priority areas before events occur. The priority score integrates seismic, flood, wildfire and demographic vulnerability — not just one hazard.', icon: '◉' },
                            { title: 'Researchers & Planners', body: 'Combine and adjust indicator weights to reflect your specific risk model. Export ranked lists to brief decision-makers with evidence-based data.', icon: '◎' },
                        ].map(({ title, body, icon }, i) => (
                            <RevealSection key={title} delay={i * 0.1}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: '12px',
                                    padding: '32px 28px',
                                    height: '100%',
                                    transition: 'border-color 0.2s ease, background 0.2s ease',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(224, 86, 69, 0.2)'; e.currentTarget.style.background = 'rgba(224, 86, 69, 0.03)' }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                                >
                                    <div style={{ fontSize: '20px', color: accent, marginBottom: '16px' }}>{icon}</div>
                                    <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#ede8e6', fontFamily: "'Inter', sans-serif" }}>{title}</div>
                                    <p style={{ fontSize: '14px', lineHeight: 1.75, color: '#9a7a74', margin: 0, fontFamily: "'Inter', sans-serif" }}>{body}</p>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </section>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 48px' }} />

                {/* ── Methodology ── */}
                <section style={{ padding: '90px 48px', maxWidth: '1140px' }}>
                    <RevealSection>
                        <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: accent, marginBottom: '20px', fontFamily: "'Inter', sans-serif" }}>Methodology</div>
                        <h2 style={{ fontSize: '34px', fontWeight: 400, margin: '0 0 56px', fontStyle: 'italic' }}>Open data, reproducible science</h2>
                    </RevealSection>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
                        <RevealSection>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent, marginBottom: '24px', fontFamily: "'Inter', sans-serif" }}>Data Sources</h3>
                            {[
                                ['Protezione Civile', 'Classificazione Sismica Comuni Italiani — May 2025 update · zones 1–4'],
                                ['ISPRA', 'Piano Indicatori di Rischio (PIR) · Flood (2020) & Landslide (2024) · population & area exposure'],
                                ['EFFIS', 'MODIS Burned Area polygons 2016–2026 · European Forest Fire Information System'],
                                ['ISTAT Census 2021', 'Population age structure by comune — from ISPRA PIR microdata'],
                                ['OpenStreetMap', 'Hospital locations per comune · Overpass API · counts cached'],
                                ['ISTAT Boundaries', 'Comuni 2025 · WGS84 · simplified at 0.001° for web delivery'],
                            ].map(([source, desc]) => (
                                <div key={source} style={{ marginBottom: '24px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#ede8e6', marginBottom: '6px', fontFamily: "'Inter', sans-serif" }}>{source}</div>
                                    <div style={{ fontSize: '13px', color: '#9a7a74', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>{desc}</div>
                                </div>
                            ))}
                        </RevealSection>

                        <RevealSection delay={0.1}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent, marginBottom: '24px', fontFamily: "'Inter', sans-serif" }}>Important Caveats</h3>
                            <ul style={{ padding: '0 0 0 16px', margin: 0, color: '#9a7a74', fontSize: '13px', lineHeight: 2.1, fontFamily: "'Inter', sans-serif" }}>
                                <li>Priority Score is a screening index, not an official risk classification</li>
                                <li>Flood/landslide data uses ISPRA 2020 hydraulic hazard maps (2024 boundaries)</li>
                                <li>Wildfire area is the total EFFIS MODIS burned area 2016–2026 per comune</li>
                                <li>Study area: Lazio, Toscana, Umbria, Abruzzo · ~1,048 municipalities</li>
                                <li>Hospital counts from OSM may undercount smaller clinics or first-aid posts</li>
                            </ul>
                        </RevealSection>
                    </div>
                </section>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 48px' }} />

                {/* ── Contact ── */}
                <section id="contact" style={{ padding: '90px 48px', maxWidth: '680px' }}>
                    <RevealSection>
                        <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: accent, marginBottom: '20px', fontFamily: "'Inter', sans-serif" }}>Contact</div>
                        <h2 style={{ fontSize: '34px', fontWeight: 400, margin: '0 0 24px', fontStyle: 'italic' }}>Request access or a demo</h2>
                        <p style={{ fontSize: '15px', lineHeight: 1.85, color: '#b8a8a2', margin: '0 0 40px', fontFamily: "'Inter', sans-serif" }}>
                            RiskWatch Italia is in active development. Reach out to discuss access, custom coverage areas, or integration with your existing civil protection workflow.
                        </p>
                    </RevealSection>

                    <RevealSection delay={0.1}>
                        {status === 'sent' ? (
                            <div style={{ background: 'rgba(224, 86, 69, 0.1)', border: `1px solid rgba(224, 86, 69, 0.3)`, borderRadius: '6px', padding: '24px', color: accent, fontSize: '15px', fontFamily: "'Inter', sans-serif" }}>
                                ✓ Message received — we'll be in touch shortly.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {[
                                    { key: 'name', label: 'Name', placeholder: 'Your name', type: 'text' },
                                    { key: 'email', label: 'Email', placeholder: 'your@email.com', type: 'email' },
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
                                {status === 'error' && <div style={{ color: '#e07070', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>Please fill in at least your name and email.</div>}
                                <button
                                    onClick={handleSubmit} disabled={status === 'sending'}
                                    style={{
                                        background: accent, color: '#ffffff', border: 'none',
                                        padding: '14px 32px', borderRadius: '6px', fontWeight: 700,
                                        fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase',
                                        cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                                        alignSelf: 'flex-start', fontFamily: "'Inter', sans-serif",
                                        opacity: status === 'sending' ? 0.6 : 1,
                                        transition: 'background 0.2s ease, opacity 0.2s ease',
                                    }}
                                    onMouseEnter={e => { if (status !== 'sending') e.currentTarget.style.background = accentHover }}
                                    onMouseLeave={e => { e.currentTarget.style.background = accent }}
                                >
                                    {status === 'sending' ? 'Saving…' : 'Send Message'}
                                </button>
                            </div>
                        )}
                    </RevealSection>
                </section>

                {/* ── Footer ── */}
                <footer style={{
                    padding: '32px 48px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    color: '#5a4a44', fontSize: '12px', fontFamily: "'Inter', sans-serif",
                }}>
                    <div>RiskWatch Italia · Central Italy</div>
                    <div>Protezione Civile · ISPRA · EFFIS · ISTAT · OpenStreetMap</div>
                </footer>
            </div>

            {/* Keyframe for grid animation */}
            <style>{`
                @keyframes landingGridDrift {
                    0%   { transform: translate(0, 0); }
                    100% { transform: translate(48px, 48px); }
                }
            `}</style>
        </div>
    )
}
