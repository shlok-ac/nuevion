import React from 'react'
import FraudHeatmap from '../../components/dashboard/FraudHeatmap'
import CityHeatmap from '../../components/dashboard/CityHeatmap'

export default function Dashboard() {
  return (
    <main className="app__content">
      {/* MAP 1: historical cyber-fraud / ATM fraud heatmap */}
      <section>
        <FraudHeatmap />
      </section>

      {/* MAP 2: caller last-known location + ATM risk hot zone */}
      <section>
        <CityHeatmap />
      </section>

    </main>
  )
}
