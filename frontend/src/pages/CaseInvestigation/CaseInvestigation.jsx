import React from 'react'
import CityHeatmap from '../../components/dashboard/CityHeatmap'

export default function CaseInvestigation() {
  return (
    <main className="app__content">
      <div className="page-heading">
        <h1>Case Investigation</h1>
        <p>Select a specific case to inspect the caller last-known location, cell tower, buffer zone and nearby ATM risk.</p>
      </div>
      <CityHeatmap />
    </main>
  )
}
