import React from 'react'
import { highRiskATMs } from '../../data/dashboardData'

// Shows the same ATM risk data as HighRiskATMs, but as horizontal bars
// for a quicker "at a glance" comparison instead of a table.
export default function ATMRiskOverview() {
  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">ATM Risk Overview</h2>
      </div>

      <div className="risk-bars">
        {highRiskATMs.map((atm) => (
          <div className="risk-bar" key={atm.id}>
            <div className="risk-bar__label">
              <span>{atm.location}</span>
              <span>{atm.riskScore}%</span>
            </div>
            <div className="risk-bar__track">
              <div
                className={`risk-bar__fill risk-bar__fill--${atm.level.toLowerCase()}`}
                style={{ width: `${atm.riskScore}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
