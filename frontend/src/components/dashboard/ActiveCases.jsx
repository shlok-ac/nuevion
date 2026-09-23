import React from 'react'
import { activeCasesBreakdown } from '../../data/dashboardData'

// Shows the total active cases plus a breakdown by priority,
// with a simple stacked progress bar for a quick visual read.
export default function ActiveCases() {
  const { total, critical, high, medium } = activeCasesBreakdown
  const criticalPct = (critical / total) * 100
  const highPct = (high / total) * 100
  const mediumPct = (medium / total) * 100

  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">Active Cases</h2>
        <span className="card__total">{total} total</span>
      </div>

      {/* Simple stacked progress bar showing the proportion of each priority */}
      <div className="progress-bar">
        <div className="progress-bar__segment progress-bar__segment--critical" style={{ width: `${criticalPct}%` }} />
        <div className="progress-bar__segment progress-bar__segment--high" style={{ width: `${highPct}%` }} />
        <div className="progress-bar__segment progress-bar__segment--medium" style={{ width: `${mediumPct}%` }} />
      </div>

      <div className="active-cases__legend">
        <div className="active-cases__legend-item">
          <span className="badge badge--critical">Critical</span>
          <span className="active-cases__legend-value">{critical}</span>
        </div>
        <div className="active-cases__legend-item">
          <span className="badge badge--high">High</span>
          <span className="active-cases__legend-value">{high}</span>
        </div>
        <div className="active-cases__legend-item">
          <span className="badge badge--medium">Medium</span>
          <span className="active-cases__legend-value">{medium}</span>
        </div>
      </div>
    </div>
  )
}
