import React from 'react'

// A single reusable card for the top summary row.
// "tone" controls the accent color (blue / orange / red / green)
// so this one component can represent any of the four summary cards.
export default function StatCard({ label, value, subtitle, tone }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__subtitle">{subtitle}</div>
    </div>
  )
}
