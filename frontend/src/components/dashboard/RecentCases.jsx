import React from 'react'
import { recentCases } from '../../data/dashboardData'

export default function RecentCases() {
  return (
    <div className="card">
      <div className="card__header">
        <div>
          <h2 className="card__title">Recent Fraud Cases</h2>
          <p className="card__subtitle">Latest reported cases and investigation status</p>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Victim</th>
              <th>City</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentCases.map((c) => (
              <tr key={c.id}>
                <td className="data-table__mono">{c.id}</td>
                <td>{c.victim}</td>
                <td>{c.city}</td>
                <td><span className={`badge badge--${c.priority.toLowerCase()}`}>{c.priority}</span></td>
                <td><span className="status-pill">{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
