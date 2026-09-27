import React, { useEffect, useMemo, useRef, useState } from 'react'
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

export default function CityHeatmap({ caseId: controlledCaseId = '', onCaseChange, investigationCases = [], onNearbyAtmsChange }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const layersRef = useRef({ markers: [], heat: null, caller: null, buffer: null, tower: null, nearby: [] })
  const [rows, setRows] = useState([])
  const [towers, setTowers] = useState([])
  const [cases, setCases] = useState([])
  const [city, setCity] = useState('ALL')
  const [risk, setRisk] = useState('ALL')
  const [internalCaseId, setInternalCaseId] = useState('')
  const caseId = controlledCaseId || internalCaseId
  const [bufferKm, setBufferKm] = useState(3)
  const [error, setError] = useState('')
  const [selectedAtmId, setSelectedAtmId] = useState('')
  const [leafletReady, setLeafletReady] = useState(() => Boolean(window.L))

  // Select the first available case automatically when no parent case is supplied.
  useEffect(() => {
    if (!controlledCaseId && !internalCaseId && cases.length) setInternalCaseId(cases[0].case_id)
  }, [cases, controlledCaseId, internalCaseId])

  // Leaflet is loaded from the CDN in index.html. If the script is still loading
  // (or was blocked), wait for it and load it dynamically so the map never stays blank.
  useEffect(() => {
    if (window.L) {
      setLeafletReady(true)
      return
    }

    const existing = document.querySelector('script[data-leaflet-loader]')
    if (existing) {
      existing.addEventListener('load', () => setLeafletReady(true), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.dataset.leafletLoader = 'true'
    script.onload = () => setLeafletReady(true)
    script.onerror = () => setError('Could not load the map library. Check your internet connection and reload the page.')
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!leafletReady || !window.L || !mapRef.current || mapInstance.current) return

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
  }, [leafletReady])

  useEffect(() => {
    if (!leafletReady || typeof window.L?.heatLayer === 'function') return
    const existing = document.querySelector('script[data-leaflet-heat-loader]')
    if (existing) return
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet.heat/dist/leaflet-heat.js'
    script.async = true
    script.dataset.leafletHeatLoader = 'true'
    document.head.appendChild(script)
  }, [leafletReady])

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

    const selectedInvestigationCase = investigationCases.find((c) => c.id === caseId)
    const selectedCallerCase = cases.find((c) => c.case_id === caseId) || (selectedInvestigationCase
      ? cases[investigationCases.findIndex((c) => c.id === selectedInvestigationCase.id)]
      : null) || cases[0]
    const selectedCase = cases.find((c) => c.case_id === selectedCallerCase?.case_id) || selectedCallerCase
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
            <p><b>Case:</b> ${selectedInvestigationCase ? `${selectedInvestigationCase.id} — ${selectedInvestigationCase.title}` : selectedCase.case_id}</p>
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

        const nearby = rows.filter((r) => (city === 'ALL' || r.city === city)).filter((r) => {
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
          marker._atmId = r.atm_id
          marker._riskColor = COLORS[r.risk_level] || '#334155'
          marker.on('click', () => setSelectedAtmId(r.atm_id))
          layersRef.current.nearby.push(marker)
        })

        map.fitBounds(layersRef.current.buffer.getBounds(), { maxZoom: 12, animate: false })
      }
    } else if (filtered.length) {
      const bounds = L.latLngBounds(filtered.map((r) => [Number(r.latitude), Number(r.longitude)]))
      map.fitBounds(bounds.pad(0.1), { maxZoom: 6, animate: false })
    }
  }, [rows, towers, cases, investigationCases, caseId, bufferKm, city, risk])

  useEffect(() => {
    layersRef.current.nearby.forEach((marker) => {
      const selected = marker._atmId === selectedAtmId
      marker.setStyle({
        radius: selected ? 10 : 5,
        fillColor: selected ? '#facc15' : (marker._riskColor || '#334155'),
        color: '#111827',
        weight: selected ? 3 : 1,
      })
      if (selected) marker.bringToFront()
    })
  }, [selectedAtmId])

  const cities = [...new Set(rows.map((r) => r.city).filter(Boolean))].sort()
  const visibleRows = rows.filter((r) =>
    (city === 'ALL' || r.city === city) && (risk === 'ALL' || r.risk_level === risk)
  )
  const selectedInvestigationCase = investigationCases.find((c) => c.id === caseId)
  const selectedCallerCase = cases.find((c) => c.case_id === caseId) || (selectedInvestigationCase
    ? cases[investigationCases.findIndex((c) => c.id === selectedInvestigationCase.id)]
    : null) || cases[0]
  const effectiveCallerCaseId = selectedCallerCase?.case_id || caseId
  const selectedCase = cases.find((c) => c.case_id === effectiveCallerCaseId) || selectedCallerCase
  const selectedTower = selectedCase && towers.find((t) => t.tower_id === selectedCase.tower_id)
  const towerLat = Number(selectedTower?.latitude)
  const towerLng = Number(selectedTower?.longitude)

  const nearbyAtms = useMemo(() => (Number.isFinite(towerLat) && Number.isFinite(towerLng)
    ? rows.filter((r) => (city === 'ALL' || r.city === city)).filter((r) => {
        const lat = Number(r.latitude)
        const lng = Number(r.longitude)
        return Number.isFinite(lat) && Number.isFinite(lng) && distanceKm(towerLat, towerLng, lat, lng) <= bufferKm
      }).sort((a, b) => Number(b.risk_score) - Number(a.risk_score))
    : []), [rows, city, towerLat, towerLng, bufferKm])

  useEffect(() => {
    if (onNearbyAtmsChange) onNearbyAtmsChange(nearbyAtms)
  }, [nearbyAtms, onNearbyAtmsChange])

  const selectAtmFromRanking = (atm) => {
    setSelectedAtmId(atm.atm_id)
    const map = mapInstance.current
    const lat = Number(atm.latitude)
    const lng = Number(atm.longitude)
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return
    map.setView([lat, lng], Math.max(map.getZoom(), 13), { animate: true })
    const marker = layersRef.current.nearby.find((m) => {
      const p = m.getLatLng()
      return Math.abs(p.lat - lat) < 0.000001 && Math.abs(p.lng - lng) < 0.000001
    })
    if (marker) setTimeout(() => marker.openPopup(), 250)
  }

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
          <select
            value={caseId}
            onChange={(e) => {
              const nextId = e.target.value
              if (onCaseChange && investigationCases.some((c) => c.id === nextId)) onCaseChange(nextId)
              else setInternalCaseId(nextId)
            }}
            aria-label="Select investigation case"
            disabled={!investigationCases.length && !cases.length}
          >
            {investigationCases.length
              ? investigationCases.map((c) => <option key={c.id} value={c.id}>{c.id} — {c.title}</option>)
              : cases.map((c) => <option key={c.case_id} value={c.case_id}>{c.case_id} · {c.city}</option>)}
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


        </div>
      )}

      <div className="caller-zone-summary">
        <span><b>Caller case:</b> {selectedCase?.case_id || '—'}</span>
        <span><b>Tower:</b> {selectedCase?.tower_id || '—'}</span>
        <span><b>Buffer:</b> {bufferKm} km</span>
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
