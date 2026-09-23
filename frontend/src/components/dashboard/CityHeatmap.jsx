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

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const headers = lines.shift().split(',').map((h) => h.trim())
  return lines
    .map((line) => {
      const values = line.split(',')
      return Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()]))
    })
    .filter((r) => r.latitude && r.longitude)
    .map((r) => ({ ...r, risk_level: String(r.risk_level || '').toUpperCase() }))
}

export default function CityHeatmap() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const layersRef = useRef({ markers: [], heat: null })
  const [rows, setRows] = useState([])
  const [city, setCity] = useState('ALL')
  const [risk, setRisk] = useState('ALL')
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
    fetch('/atm_predictions.csv')
      .then((res) => {
        if (!res.ok) throw new Error('CSV not found')
        return res.text()
      })
      .then((text) => setRows(parseCsv(text)))
      .catch(() => setError('Could not load ATM prediction data.'))
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    const L = window.L
    if (!map || !L || !rows.length) return

    layersRef.current.markers.forEach((marker) => marker.remove())
    if (layersRef.current.heat) layersRef.current.heat.remove()
    layersRef.current.markers = []
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
        </div>
      `).addTo(map)

      layersRef.current.markers.push(marker)
    })

    if (filtered.length) {
      const bounds = L.latLngBounds(filtered.map((r) => [Number(r.latitude), Number(r.longitude)]))
      map.fitBounds(bounds.pad(0.1), { maxZoom: 6, animate: false })
    }
  }, [rows, city, risk])

  const cities = [...new Set(rows.map((r) => r.city).filter(Boolean))].sort()
  const visibleRows = rows.filter((r) =>
    (city === 'ALL' || r.city === city) && (risk === 'ALL' || r.risk_level === risk)
  )

  return (
    <div className="card city-map-card">
      <div className="card__header city-map-header">
        <div>
          <h2 className="card__title">ATM Risk Heatmap</h2>
          <p className="city-map-subtitle">India-wide fraud risk density with ATM locations</p>
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
        </div>
      </div>

      {error ? <div className="city-map-error">{error}</div> : <div ref={mapRef} className="city-map" />}

      <div className="heatmap-legend city-map-legend">
        <span className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--low" /> Low</span>
        <span className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--medium" /> Medium</span>
        <span className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--high" /> High</span>
        <span className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--critical" /> Critical</span>
        <span className="city-map-count">{visibleRows.length} ATMs shown</span>
      </div>
    </div>
  )
}
