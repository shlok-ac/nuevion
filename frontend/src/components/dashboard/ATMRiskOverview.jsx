import React from 'react'
import { highRiskATMs } from '../../data/dashboardData'

export default function ATMRiskOverview() {
  const ranked = [...highRiskATMs].sort((a, b) => b.riskScore - a.riskScore)

  return (
    <div className="card">
      <div className="card__header">
        <div>
          <h2 className="card__title">Top ATM Risk Ranking</h2>
          <p className="card__subtitle">Highest-risk ATMs based on current risk score</p>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th><th>ATM</th><th>Location</th><th>Risk Score</th><th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((atm, index) => (
              <tr key={atm.id}>
                <td><strong>#{index + 1}</strong></td>
                <td className="data-table__mono">{atm.id}</td>
                <td>{atm.location}</td>
                <td><strong>{atm.riskScore}</strong></td>
                <td><span className={`badge badge--${atm.level.toLowerCase()}`}>{atm.level}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
