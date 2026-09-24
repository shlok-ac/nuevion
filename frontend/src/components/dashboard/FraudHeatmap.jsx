import React, { useEffect, useMemo, useRef, useState } from 'react'

const HEAT_GRADIENT = {
  0.00: '#1234a6',
  0.20: '#176ee8',
  0.40: '#11c7c9',
  0.60: '#35d04f',
  0.78: '#f4e62b',
  0.90: '#ff8c1a',
  1.00: '#ff2418',
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  const headers = lines.shift().split(',').map((h) => h.trim())
  return lines.map((line) => {
    const values = line.split(',')
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()]))
  })
}

function unique(rows, key) {
  return [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort()
}

function riskClass(level) {
  return String(level || 'LOW').toLowerCase()
}

export default function FraudHeatmap() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const heatRef = useRef(null)
  const markersRef = useRef([])
  const [rows, setRows] = useState([])
  const [atmRows, setAtmRows] = useState([])
  const [city, setCity] = useState('ALL')
  const [crimeType, setCrimeType] = useState('ALL')
  const [risk, setRisk] = useState('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!window.L || !mapRef.current || mapInstance.current) return
    const L = window.L
    const map = L.map(mapRef.current, {
      scrollWheelZoom: true,
      maxBounds: [[6, 67], [37.5, 98]],
      maxBoundsViscosity: 0.85,
    }).setView([22.7, 79.2], 5)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    mapInstance.current = map
    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/fraud_incidents.csv').then((r) => { if (!r.ok) throw new Error(); return r.text() }),
      fetch('/atm_predictions.csv').then((r) => { if (!r.ok) throw new Error(); return r.text() }),
    ])
      .then(([incidentText, atmText]) => {
        setRows(parseCsv(incidentText))
        setAtmRows(parseCsv(atmText))
      })
      .catch(() => setError('Could not load fraud incident or ATM data. Make sure fraud_incidents.csv and atm_predictions.csv are in the public folder.'))
  }, [])

  const cities = useMemo(() => unique(rows, 'city'), [rows])
  const crimes = useMemo(() => unique(rows, 'crime_type'), [rows])

  const filtered = useMemo(() => rows.filter((r) => {
    const dateOk = (!fromDate || r.date >= fromDate) && (!toDate || r.date <= toDate)
    const timeOk = (!fromTime || r.time >= fromTime) && (!toTime || r.time <= toTime)
    return dateOk && timeOk &&
      (city === 'ALL' || r.city === city) &&
      (crimeType === 'ALL' || r.crime_type === crimeType) &&
      (risk === 'ALL' || r.risk_level === risk)
  }), [rows, city, crimeType, risk, fromDate, toDate, fromTime, toTime])

  const rankedAtms = useMemo(() => {
    const filteredAtms = atmRows.filter((r) =>
      (city === 'ALL' || r.city === city) &&
      (risk === 'ALL' || String(r.risk_level || '').toUpperCase() === risk)
    )

    return filteredAtms
      .map((r) => ({
        id: r.atm_id || r.id,
        bank: r.bank_name || '—',
        city: r.city || '—',
        score: Number.isFinite(Number(r.risk_score)) ? Number(r.risk_score) : 0,
        level: String(r.risk_level || 'LOW').toUpperCase(),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }, [atmRows, city, risk])

  useEffect(() => {
    const map = mapInstance.current
    const L = window.L
    if (!map || !L) return
    if (heatRef.current) heatRef.current.remove()
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const points = filtered.map((r) => [
      Number(r.latitude),
      Number(r.longitude),
      String(r.risk_level || '').toUpperCase() === 'HIGH' ? 1 :
        String(r.risk_level || '').toUpperCase() === 'MEDIUM' ? 0.7 :
        String(r.risk_level || '').toUpperCase() === 'CRITICAL' ? 1 : 0.4,
    ]).filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))

    if (points.length && typeof L.heatLayer === 'function') {
      heatRef.current = L.heatLayer(points, {
        radius: 38,
        blur: 25,
        maxZoom: 11,
        max: 1,
        minOpacity: 0.35,
        gradient: HEAT_GRADIENT,
      }).addTo(map)
    }

    filtered.forEach((r) => {
      const lat = Number(r.latitude), lng = Number(r.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      const marker = L.circleMarker([lat, lng], {
        radius: 4,
        fillColor: '#111827',
        color: '#ffffff',
        weight: 1,
        fillOpacity: 0.9,
      }).bindPopup(`
        <div class="atm-popup">
          <h3>${r.incident_id || 'Fraud case'}</h3>
          <p><b>Date:</b> ${r.date || '—'} ${r.time || ''}</p>
          <p><b>City:</b> ${r.city || '—'}</p>
          <p><b>Area:</b> ${r.area || '—'}</p>
          <p><b>Crime:</b> ${r.crime_type || '—'}</p>
          <p><b>Risk:</b> ${r.risk_level || '—'}</p>
        </div>
      `).addTo(map)
      markersRef.current.push(marker)
    })

    if (points.length) {
      map.fitBounds(L.latLngBounds(points.map(([lat, lng]) => [lat, lng])).pad(0.08), { maxZoom: 10, animate: false })
    }
  }, [filtered])

  const reset = () => {
    setCity('ALL')
    setCrimeType('ALL')
    setRisk('ALL')
    setFromDate('')
    setToDate('')
    setFromTime('')
    setToTime('')
  }

  const activeFilterText = [
    city !== 'ALL' ? city : 'All cities',
    crimeType !== 'ALL' ? crimeType : 'All crimes',
    risk !== 'ALL' ? risk : 'All risk levels',
  ].join(' · ')

  return (
    <div className="card city-map-card fraud-map-card">
      <div className="card__header city-map-header">
        <div>
          <h2 className="card__title">Fraud Heatmap</h2>
          <p className="city-map-subtitle">Historical ATM/cyber-fraud activity — filter by time, location and fraud type</p>
        </div>
        <div className="city-map-filters fraud-filter-grid">
          <select value={city} onChange={(e) => setCity(e.target.value)}><option value="ALL">All cities</option>{cities.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={crimeType} onChange={(e) => setCrimeType(e.target.value)}><option value="ALL">All crime types</option>{crimes.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={risk} onChange={(e) => setRisk(e.target.value)}><option value="ALL">All risk levels</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="From date" title="From date" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="To date" title="To date" />
          <input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} aria-label="From time" title="From time" />
          <input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} aria-label="To time" title="To time" />
          <button className="filter-reset" onClick={reset}>Reset</button>
        </div>
      </div>

      {error ? (
        <div className="city-map-error">{error}</div>
      ) : (
        <div className="fraud-map-layout">
          <div ref={mapRef} className="city-map fraud-map" />

          <aside className="fraud-insights-panel">
            <div className="case-count-block">
              <span className="case-count-label">CASES MATCHING FILTER</span>
              <strong className="case-count-value">{filtered.length}</strong>
              <span className="case-count-context">{activeFilterText}</span>
            </div>

            <div className="atm-ranking-header">
              <div>
                <h3>ATM Ranking</h3>
                <p>Filtered ATMs · highest risk first</p>
              </div>
              <span className="atm-ranking-count">{rankedAtms.length}</span>
            </div>

            <div className="atm-ranking-list">
              {rankedAtms.length ? rankedAtms.map((atm, index) => (
                <div className="atm-ranking-row" key={atm.id}>
                  <span className="atm-rank">#{index + 1}</span>
                  <div className="atm-ranking-main">
                    <strong>{atm.id}</strong>
                    <span>{atm.bank} · {atm.city}</span>
                  </div>
                  <div className="atm-ranking-score">
                    <strong>{atm.score.toFixed(0)}</strong>
                    <span className={`risk-badge risk-badge--${riskClass(atm.level)}`}>{atm.level}</span>
                  </div>
                </div>
              )) : (
                <div className="atm-ranking-empty">No ATMs match the selected filters.</div>
              )}
            </div>
          </aside>
        </div>
      )}

      <div className="caller-zone-summary">
        <span><b>Cases shown:</b> {filtered.length}</span>
        <span><b>Crime:</b> {crimeType === 'ALL' ? 'All' : crimeType}</span>
        <span><b>Location:</b> {city === 'ALL' ? 'India' : city}</span>
      </div>
      <div className="heatmap-legend city-map-legend">
        <span className="heatmap-legend__item"><span className="heatmap-legend__swatch" style={{ background: 'linear-gradient(90deg,#1234a6,#11c7c9,#35d04f,#f4e62b,#ff8c1a,#ff2418)' }} /> Fraud density</span>
        <span className="city-map-count">{filtered.length} cases</span>
      </div>
    </div>
  )
}
