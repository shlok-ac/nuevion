import React, { useEffect, useRef, useState } from 'react'

import './caller-location-map.css'
const COLORS = {
  LOW: '#166534',
  MEDIUM: '#854d0e',
  HIGH: '#9a3412',
  CRITICAL: '#991b1b',
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

export default function CityHeatmap({
  caseId: controlledCaseId = '',
  investigationCases = [],
  atmRows = [],
  atmLoading = false,
  atmError = '',
  onAtmSelect,
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const layersRef = useRef({ markers: [], caller: null, buffer: null, tower: null, nearby: [] })
  const [rows, setRows] = useState([])
  const [towers, setTowers] = useState([])
  const [cases, setCases] = useState([])
  const [city] = useState('ALL')
  const [risk] = useState('ALL')
  const [internalCaseId, setInternalCaseId] = useState('')
  const caseId = controlledCaseId || internalCaseId
  const [bufferKm] = useState(3)
  const [error, setError] = useState('')
  const [dataNotice, setDataNotice] = useState('')
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
    setRows(atmRows
      .filter((row) =>
        row.latitude != null &&
        row.longitude != null &&
        Number.isFinite(Number(row.latitude)) &&
        Number.isFinite(Number(row.longitude))
      )
      .map((row) => ({
        ...row,
        risk_level: String(
          row.atm_risk_inference?.risk_level ||
          row.predicted_risk_level ||
          row.risk_level ||
          ''
        ).toUpperCase(),
      })))
  }, [atmRows])

  useEffect(() => {
    let active = true
    const loadReferenceOverlays = async () => {
      const [towerResult, caseResult] = await Promise.allSettled([
        fetch('/cell_towers.csv').then((response) => {
          if (!response.ok) throw new Error('Tower CSV not found')
          return response.text()
        }),
        fetch('/caller_cases.csv').then((response) => {
          if (!response.ok) throw new Error('Caller CSV not found')
          return response.text()
        }),
      ])
      if (!active) return
      if (towerResult.status === 'fulfilled') setTowers(parseCsv(towerResult.value, true))
      if (caseResult.status === 'fulfilled') setCases(parseCsv(caseResult.value, false))
      const missing = [
        towerResult.status === 'rejected' && 'cell-tower',
        caseResult.status === 'rejected' && 'caller-case',
      ].filter(Boolean)
      if (missing.length) {
        setDataNotice(`Prototype caller/tower overlay unavailable: ${missing.join(' and ')} reference data could not be loaded.`)
      }
    }
    loadReferenceOverlays()
    return () => {
      active = false
    }
  }, [])


  useEffect(() => {
    const map = mapInstance.current
    const L = window.L
    if (!map || !L) return

    layersRef.current.markers.forEach((marker) => marker.remove())
    layersRef.current.nearby.forEach((marker) => marker.remove())
    ;['caller', 'buffer', 'tower'].forEach((key) => {
      if (layersRef.current[key]) layersRef.current[key].remove()
      layersRef.current[key] = null
    })
    layersRef.current.markers = []
    layersRef.current.nearby = []

    const filtered = rows.filter((r) =>
      (city === 'ALL' || r.city === city) &&
      (risk === 'ALL' || r.risk_level === risk)
    )

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
          <p><b>Stored risk score:</b> ${r.risk_score == null ? '—' : r.risk_score}</p>
          <p><b>ATM risk classification:</b> ${r.atm_risk_inference?.risk_level || 'Not inferred for this ATM'}</p>
          <p><b>Classifier class probability (not calibrated):</b> ${r.atm_risk_inference?.prediction_confidence == null ? '—' : `${r.atm_risk_inference.prediction_confidence}%`}</p>
          <p>${r.atm_risk_inference?.confidence_type || ''}</p>
          <p>ATM risk only; not a complaint-to-ATM link or cash-out probability.</p>
        </div>
      `).addTo(map)

      // Clicking any ATM reports the row up, so the page can open its details card.
      marker.on('click', () => onAtmSelect?.(r))

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
                <p><b>Stored risk score:</b> ${r.risk_score == null ? '—' : r.risk_score}</p>
                <p><b>ATM risk classification:</b> ${r.atm_risk_inference?.risk_level || 'Not inferred for this ATM'}</p>
                <p><b>Classifier class probability (not calibrated):</b> ${r.atm_risk_inference?.prediction_confidence == null ? '—' : `${r.atm_risk_inference.prediction_confidence}%`}</p>
                <p>${r.atm_risk_inference?.confidence_type || ''}</p>
                <p>Caller/tower and incident overlays are prototype reference data; no cash-out relationship is established.</p>
            </div>
          `).addTo(map)
          marker._atmId = r.atm_id
          marker._riskColor = COLORS[r.risk_level] || '#334155'
          marker.on('click', () => {
            setSelectedAtmId(r.atm_id)
            onAtmSelect?.(r)
          })
          layersRef.current.nearby.push(marker)
        })

        map.fitBounds(layersRef.current.buffer.getBounds(), { maxZoom: 12, animate: false })
      }
    } else if (filtered.length) {
      const bounds = L.latLngBounds(filtered.map((r) => [Number(r.latitude), Number(r.longitude)]))
      map.fitBounds(bounds.pad(0.1), { maxZoom: 6, animate: false })
    }
  }, [leafletReady, rows, towers, cases, investigationCases, caseId, bufferKm, city, risk])

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

  const selectedInvestigationCase = investigationCases.find((c) => c.id === caseId)
  const selectedCallerCase = cases.find((c) => c.case_id === caseId) || (selectedInvestigationCase
  ? cases[investigationCases.findIndex((c) => c.id === selectedInvestigationCase.id)]
  : null) || cases[0]
  const selectedCase = cases.find((c) => c.case_id === selectedCallerCase?.case_id) || selectedCallerCase

  return (
    <div className="card city-map-card caller-map-card">
      {dataNotice && <div className="city-map-error">{dataNotice}</div>}
      {atmLoading && <div className="city-map-error">Loading live ATM catalog…</div>}
      {atmError && <div role="alert" className="city-map-error">Live ATM catalog unavailable: {atmError}</div>}
      {!atmLoading && !atmError && rows.length === 0 && <div className="city-map-error">No ATM catalog records with valid coordinates are available to map.</div>}
      {error ? (
        <div className="city-map-error">{error}</div>
      ) : (
        <div className="caller-map-layout">
          <div ref={mapRef} className="city-map caller-map" />


        </div>
      )}

      <div className="caller-zone-summary">
        <div className="caller-zone-summary__group">
          <div className="caller-zone-summary__item">
            <span className="caller-zone-summary__label">Caller case</span>
            <span className="caller-zone-summary__value">{selectedCase?.case_id || '—'}</span>
          </div>
          <span aria-hidden="true" className="caller-zone-summary__divider" />
          <div className="caller-zone-summary__item">
            <span className="caller-zone-summary__label">Cell tower</span>
            <span className="caller-zone-summary__value">{selectedCase?.tower_id || '—'}</span>
          </div>
          <span aria-hidden="true" className="caller-zone-summary__divider" />
          <div className="caller-zone-summary__item">
            <span className="caller-zone-summary__label">Search buffer</span>
            <span className="caller-zone-summary__value">{bufferKm} km</span>
          </div>
        </div>
      </div>

      <div className="heatmap-legend city-map-legend">
        <span className="heatmap-legend__heading">ATM risk</span>
        <span className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--low" /> Low</span>
        <span className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--medium" /> Medium</span>
        <span className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--high" /> High</span>
        <span className="heatmap-legend__item"><span className="heatmap-legend__swatch heatmap-legend__swatch--critical" /> Critical</span>
        <span aria-hidden="true" className="heatmap-legend__divider" />
        <span className="heatmap-legend__heading">Map overlay</span>
        <span className="heatmap-legend__item"><span className="caller-legend-dot" /> Caller</span>
        <span className="heatmap-legend__item"><span className="caller-legend-zone" /> Caller buffer</span>
      </div>
    </div>
  )

}
