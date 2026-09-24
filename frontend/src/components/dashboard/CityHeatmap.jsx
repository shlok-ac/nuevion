import React, { useEffect, useRef, useState } from 'react'
import { scoreToLevel } from '../../data/dashboardData'

const COLORS = {
  LOW: '#166534',
  MEDIUM: '#854d0e',
  HIGH: '#9a3412',
  CRITICAL: '#991b1b',
}

const HEAT_GRADIENT = {
  0.00: '#1234a6',
  0.20: '#176ee8',
  0.40: '#11c7c9',
  0.60: '#35d04f',
  0.78: '#f4e62b',
  0.90: '#ff8c1a',
  1.00: '#ff2418',
}

function parseCsv(text, requireCoordinates = false) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  const headers = lines.shift().split(',').map((h) => h.trim())
  return lines
    .map((line) => {
      const values = line.split(',')
      return Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()]))
    })
    .filter((r) => !requireCoordinates || (r.latitude && r.longitude))
    .map((r) => ({ ...r, risk_level: String(r.risk_level || '').toUpperCase() }))
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (v) => (v * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function riskClass(level) {
  return String(level || '').toLowerCase().replace('critical', 'critical')
}

export default function CityHeatmap() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const layersRef = useRef({ markers: [], heat: null, caller: null, buffer: null, tower: null, nearby: [] })
  const [rows, setRows] = useState([])
  const [towers, setTowers] = useState([])
  const [cases, setCases] = useState([])
  const [city, setCity] = useState('ALL')
  const [risk, setRisk] = useState('ALL')
  const [caseId, setCaseId] = useState('')
  const [bufferKm, setBufferKm] = useState(3)
  const [error, setError] = useState('')

  // Select the first caller case automatically so the case dropdown is never blank.
  useEffect(() => {
    if (!caseId && cases.length) setCaseId(cases[0].case_id)
  }, [cases, caseId])

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
      fetch('/atm_predictions.csv').then((r) => { if (!r.ok) throw new Error('ATM CSV not found'); return r.text() }),
      fetch('/cell_towers.csv').then((r) => { if (!r.ok) throw new Error('Tower CSV not found'); return r.text() }),
      fetch('/caller_cases.csv').then((r) => { if (!r.ok) throw new Error('Caller CSV not found'); return r.text() }),
    ])
      .then(([atmText, towerText, caseText]) => {
        setRows(parseCsv(atmText, true))
        setTowers(parseCsv(towerText, true))
        setCases(parseCsv(caseText, false))
      })
      .catch(() => setError('Could not load ATM, tower, or caller data.'))
  }, [])

  useEffect(() => {
    if (!caseId && cases.length) setCaseId(cases[0].case_id)
  }, [cases, caseId])

  useEffect(() => {
    const map = mapInstance.current
    const L = window.L
    if (!map || !L || !rows.length) return

    layersRef.current.markers.forEach((marker) => marker.remove())
    if (layersRef.current.heat) layersRef.current.heat.remove()
    layersRef.current.nearby.forEach((marker) => marker.remove())
    ;['caller', 'buffer', 'tower'].forEach((key) => {
      if (layersRef.current[key]) layersRef.current[key].remove()
      layersRef.current[key] = null
    })
    layersRef.current.markers = []
    layersRef.current.nearby = []
    layersRef.current.heat = null

    const filtered = rows.filter((r) =>
      (city === 'ALL' || r.city === city) &&
      (risk === 'ALL' || r.risk_level === risk)
    )

    const points = filtered
      .map((r) => [Number(r.latitude), Number(r.longitude), Math.max(0, Math.min(1, Number(r.risk_score) / 100))])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))

    if (points.length && typeof L.heatLayer === 'function') {
      layersRef.current.heat = L.heatLayer(points, {
        radius: 42,
        blur: 26,
        maxZoom: 10,
        max: 1,
        minOpacity: 0.34,
        gradient: HEAT_GRADIENT,
      }).addTo(map)
    }

    filtered.forEach((r) => {
      const lat = Number(r.latitude)
      const lng = Number(r.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

      const marker = L.circleMarker([lat, lng], {
        radius: 3,
        fillColor: COLORS[r.risk_level] || '#334155',
        color: 'transparent',
        weight: 0,
        fillOpacity: 1,
      }).bindPopup(`
        <div class="atm-popup">
          <h3>${r.atm_id}</h3>
          <p><b>Bank:</b> ${r.bank_name}</p>
          <p><b>City:</b> ${r.city}</p>
          <p><b>Risk score:</b> ${Number(r.risk_score).toFixed(2)}</p>
          <p><b>Risk level:</b> ${r.risk_level}</p>
          <p><b>Predicted:</b> ${r.predicted_risk_level}</p>
          <p><b>Confidence:</b> ${Number(r.prediction_confidence).toFixed(1)}%</p>
          <p><b>Recommended action:</b> ${['HIGH', 'CRITICAL'].includes(String(r.risk_level).toUpperCase()) ? 'Prioritize patrol frequency and field verification' : 'Continue routine monitoring'}</p>
        </div>
      `).addTo(map)

      layersRef.current.markers.push(marker)
    })

    const selectedCase = cases.find((c) => c.case_id === caseId)
    const tower = selectedCase && towers.find((t) => t.tower_id === selectedCase.tower_id)
    if (tower) {
      const lat = Number(tower.latitude)
      const lng = Number(tower.longitude)
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        layersRef.current.tower = L.circleMarker([lat, lng], {
          radius: 7,
          fillColor: '#2563eb',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1,
        }).bindPopup(`
          <div class="caller-popup">
            <h3>Caller last-known area</h3>
            <p><b>Case:</b> ${selectedCase.case_id}</p>
            <p><b>Tower:</b> ${tower.tower_id}</p>
            <p><b>City:</b> ${tower.city}</p>
            <p><b>Estimated accuracy:</b> ${selectedCase.estimated_accuracy_km || '3'} km</p>
            <p><b>Demo data:</b> Simulated SIH prototype</p>
          </div>
        `).addTo(map)

        layersRef.current.caller = L.marker([lat, lng], {
          icon: L.divIcon({ className: 'caller-pin', html: '<span>📍</span>', iconSize: [28, 28], iconAnchor: [14, 28] }),
        }).addTo(map)

        layersRef.current.buffer = L.circle([lat, lng], {
          radius: bufferKm * 1000,
          color: '#2563eb',
          weight: 2,
          dashArray: '8 6',
          fillColor: '#2563eb',
          fillOpacity: 0.08,
        }).addTo(map)

        const nearby = filtered.filter((r) => {
          const a = L.latLng(lat, lng)
          const b = L.latLng(Number(r.latitude), Number(r.longitude))
          return Number.isFinite(b.lat) && Number.isFinite(b.lng) && map.distance(a, b) <= bufferKm * 1000
        })

        nearby.forEach((r) => {
          const marker = L.circleMarker([Number(r.latitude), Number(r.longitude)], {
            radius: 5,
            fillColor: COLORS[r.risk_level] || '#334155',
            color: '#111827',
            weight: 1,
            fillOpacity: 1,
          }).bindPopup(`
            <div class="atm-popup">
              <h3>${r.atm_id} · Inside caller zone</h3>
              <p><b>Bank:</b> ${r.bank_name}</p>
              <p><b>Risk score:</b> ${Number(r.risk_score).toFixed(2)}</p>
              <p><b>Risk level:</b> ${r.risk_level}</p>
              <p><b>Recommended action:</b> ${['HIGH', 'CRITICAL'].includes(String(r.risk_level).toUpperCase()) ? 'Prioritize patrol frequency and field verification' : 'Continue routine monitoring'}</p>
            </div>
          `).addTo(map)
          layersRef.current.nearby.push(marker)
        })

        map.fitBounds(layersRef.current.buffer.getBounds(), { maxZoom: 12, animate: false })
      }
    } else if (filtered.length) {
      const bounds = L.latLngBounds(filtered.map((r) => [Number(r.latitude), Number(r.longitude)]))
      map.fitBounds(bounds.pad(0.1), { maxZoom: 6, animate: false })
    }
  }, [rows, towers, cases, caseId, bufferKm, city, risk])

  const cities = [...new Set(rows.map((r) => r.city).filter(Boolean))].sort()
  const visibleRows = rows.filter((r) =>
    (city === 'ALL' || r.city === city) && (risk === 'ALL' || r.risk_level === risk)
  )
  const selectedCase = cases.find((c) => c.case_id === caseId)
  const selectedTower = selectedCase && towers.find((t) => t.tower_id === selectedCase.tower_id)
  const towerLat = Number(selectedTower?.latitude)
  const towerLng = Number(selectedTower?.longitude)

  const nearbyAtms = Number.isFinite(towerLat) && Number.isFinite(towerLng)
    ? visibleRows.filter((r) => {
        const lat = Number(r.latitude)
        const lng = Number(r.longitude)
        return Number.isFinite(lat) && Number.isFinite(lng) && distanceKm(towerLat, towerLng, lat, lng) <= bufferKm
      }).sort((a, b) => Number(b.risk_score) - Number(a.risk_score))
    : []

  return (
    <div className="card city-map-card caller-map-card">
      <div className="card__header city-map-header">
        <div>
          <h2 className="card__title">Caller Location + ATM Risk Zone</h2>
          <p className="city-map-subtitle">Cell-tower last-known location with a 3–5 km ATM search buffer</p>
        </div>
        <div className="city-map-filters">
          <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="Filter by city">
            <option value="ALL">All cities</option>
            {cities.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="Filter by risk level">
            <option value="ALL">All risk levels</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <select value={caseId} onChange={(e) => setCaseId(e.target.value)} aria-label="Select caller case" disabled={!cases.length}>
            {!cases.length ? <option value="">No caller cases</option> : null}
            {cases.map((c) => <option key={c.case_id} value={c.case_id}>{c.case_id} · {c.city}</option>)}
          </select>
          <select value={bufferKm} onChange={(e) => setBufferKm(Number(e.target.value))} aria-label="Caller buffer radius">
            <option value={3}>3 km buffer</option>
            <option value={5}>5 km buffer</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="city-map-error">{error}</div>
      ) : (
        <div className="caller-map-layout">
          <div ref={mapRef} className="city-map caller-map" />

          <aside className="caller-insights-panel">
            <div className="atm-count-block">
              <span className="atm-count-label">ATMs IN CALLER CIRCLE</span>
              <strong className="atm-count-value">{nearbyAtms.length}</strong>
              <span className="atm-count-context">Within {bufferKm} km of the selected cell-tower location</span>
            </div>

            <div className="atm-ranking-header">
              <div>
                <h3>ATM Ranking</h3>
                <p>Inside caller buffer · highest risk first</p>
              </div>
              <span className="atm-ranking-count">{nearbyAtms.length}</span>
            </div>

            <div className="atm-ranking-list">
              {nearbyAtms.length ? nearbyAtms.map((atm, index) => (
                <div className="atm-ranking-row" key={atm.atm_id}>
                  <span className="atm-rank">#{index + 1}</span>
                  <div className="atm-ranking-main">
                    <strong>{atm.atm_id}</strong>
                    <span>{atm.bank_name} · {atm.city}</span>
                  </div>
                  <div className="atm-ranking-score">
                    <strong>{Number(atm.risk_score).toFixed(0)}</strong>
                    <span className={`risk-badge risk-badge--${riskClass(atm.risk_level)}`}>{atm.risk_level}</span>
                  </div>
                </div>
              )) : (
                <div className="atm-ranking-empty">No ATMs inside the selected caller buffer.</div>
              )}
            </div>
          </aside>
        </div>
      )}

      <div className="caller-zone-summary">
        <span><b>Caller case:</b> {selectedCase?.case_id || '—'}</span>
        <span><b>Tower:</b> {selectedCase?.tower_id || '—'}</span>
        <span><b>Buffer:</b> {bufferKm} km</span>
        <span><b>ATMs in circle:</b> {nearbyAtms.length}</span>
      </div>

      <div className="heatmap-legend city-map-legend">
        <span className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--low" /> Low</span>
        <span className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--medium" /> Medium</span>
        <span className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--high" /> High</span>
        <span className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--critical" /> Critical</span>
        <span className="heatmap-legend__item"><span className="caller-legend-dot" /> Caller</span>
        <span className="heatmap-legend__item"><span className="caller-legend-zone" /> Caller buffer</span>
      </div>
    </div>
  )

}
