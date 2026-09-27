import React, { useEffect, useMemo, useRef, useState } from 'react'

import './caller-location-map.css'
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

export default function CityHeatmap({
  caseId: controlledCaseId = '',
  investigationCases = [],
  onNearbyAtmsChange,
  onAtmSelect,
  // City filter, lifted to the page so the region list and the map stay in step.
  //
  // This component renders no city dropdown of its own, so the value is fully
  // controlled: the page's region selection is the only thing that changes it.
  city = 'ALL',
  // The city whose caller tower should be drawn, used to resolve a tower by name.
  // Falling back to a positional lookup would be wrong: the investigation list holds
  // hundreds of cases while the caller data has one row per city, so index N is not
  // case N.
  towerCity = '',
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const layersRef = useRef({ markers: [], heat: null, caller: null, buffer: null, tower: null, nearby: [] })
  const [rows, setRows] = useState([])
  const [towers, setTowers] = useState([])
  const [cases, setCases] = useState([])
  const [risk] = useState('ALL')
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

      // Clicking any ATM reports the row up, so the page can open its details card.
      marker.on('click', () => onAtmSelect?.(r))

      layersRef.current.markers.push(marker)
    })

    /*
     * Resolve the caller record by the tower's city, not by the case's position.
     *
     * The positional fallback this replaces picked a different city for 503 of 505
     * cases, because the caller data has one row per city while the investigation list
     * has hundreds of cases. `towerCity` is supplied by the page from the same region
     * that drives the ATM filter, so the tower and the markers always agree.
     */
    const selectedInvestigationCase = investigationCases.find((c) => c.id === caseId)
    const selectedCallerCase =
      (towerCity && cases.find((c) => c.city === towerCity))
      || cases.find((c) => c.case_id === caseId)
      || cases[0]
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
          marker.on('click', () => {
            setSelectedAtmId(r.atm_id)
            onAtmSelect?.(r)
          })
          layersRef.current.nearby.push(marker)
        })

        // The call circle belongs to the case's call city, which is not always the
        // selected cash-out region, so it can sit far from that region's ATMs. Frame
        // both when that happens; otherwise keep the tight 3 km buffer zoom.
        const fit = layersRef.current.buffer.getBounds()
        const strays = filtered.some(
          (r) => !fit.contains(L.latLng(Number(r.latitude), Number(r.longitude))),
        )
        if (strays) {
          fit.extend(L.latLngBounds(filtered.map((r) => [Number(r.latitude), Number(r.longitude)])))
        }
        map.fitBounds(fit.pad(0.1), { maxZoom: 12, animate: false })
      }
    } else if (filtered.length) {
      const bounds = L.latLngBounds(filtered.map((r) => [Number(r.latitude), Number(r.longitude)]))
      map.fitBounds(bounds.pad(0.1), { maxZoom: 6, animate: false })
    }
  }, [rows, towers, cases, investigationCases, caseId, bufferKm, city, risk, towerCity])

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
  // Same city-first resolution as the map effect above, so the buffer drawn on the map
  // and the "in caller zone" count reported to the page agree.
  const selectedCallerCase =
    (towerCity && cases.find((c) => c.city === towerCity))
    || cases.find((c) => c.case_id === caseId)
    || cases[0]
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

  return (
    <div className="card city-map-card caller-map-card">
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
