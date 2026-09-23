import React from 'react'
import { recentCases } from '../data/dashboardData'

export default function RecentCases() {
  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">Recent Cases</h2>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Victim</th>
              <th>Fraud Amount</th>
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
                <td>{c.amount}</td>
                <td>{c.city}</td>
                <td>
                  <span className={`badge badge--${c.priority.toLowerCase()}`}>{c.priority}</span>
                </td>
                <td>
                  <span className="status-pill">{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
