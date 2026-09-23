import React from 'react'
import { cityRisk, scoreToLevel } from '../../data/dashboardData'

// Version 1 uses a colored grid instead of a real geographic map.
// Each tile is colored by risk level. This component is kept separate
// and self-contained so it can be swapped for a real India/Maharashtra
// map component later without touching the rest of the dashboard.
export default function CityHeatmap() {
  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">City Fraud Heatmap</h2>
      </div>

      <div className="heatmap-grid">
        {cityRisk.map((entry) => {
          const level = scoreToLevel(entry.score)
          return (
            <div key={entry.city} className={`heatmap-tile heatmap-tile--${level.toLowerCase()}`}>
              <div className="heatmap-tile__city">{entry.city}</div>
              <div className="heatmap-tile__score">{entry.score}</div>
              <div className="heatmap-tile__level">{level} Risk</div>
            </div>
          )
        })}
      </div>

      <div className="heatmap-legend">
        <span className="heatmap-legend__item">
          <span className="heatmap-legend__swatch heatmap-legend__swatch--low" /> Low
        </span>
        <span className="heatmap-legend__item">
          <span className="heatmap-legend__swatch heatmap-legend__swatch--medium" /> Medium
        </span>
        <span className="heatmap-legend__item">
          <span className="heatmap-legend__swatch heatmap-legend__swatch--high" /> High
        </span>
        <span className="heatmap-legend__item">
          <span className="heatmap-legend__swatch heatmap-legend__swatch--critical" /> Critical
        </span>
      </div>
    </div>
  )
}
