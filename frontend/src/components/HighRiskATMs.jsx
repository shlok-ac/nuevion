import React from 'react'
import { highRiskATMs } from '../data/dashboardData'

// Turns a risk level string like "Critical" into the matching CSS class suffix.
function levelToClass(level) {
  return level.toLowerCase()
}

export default function HighRiskATMs() {
  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">High Risk ATMs</h2>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ATM ID</th>
              <th>Location</th>
              <th>Risk Score</th>
              <th>Fraud Cases</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {highRiskATMs.map((atm) => (
              <tr key={atm.id}>
                <td className="data-table__mono">{atm.id}</td>
                <td>{atm.location}</td>
                <td>{atm.riskScore}</td>
                <td>{atm.fraudCases}</td>
                <td>
                  <span className={`badge badge--${levelToClass(atm.level)}`}>{atm.level}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
