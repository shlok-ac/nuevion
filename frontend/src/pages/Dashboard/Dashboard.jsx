import React from 'react'
import StatCard from '../../components/dashboard/StatCard'
import ActiveCases from '../../components/dashboard/ActiveCases'
import HighRiskATMs from '../../components/dashboard/HighRiskATMs'
import CityHeatmap from '../../components/dashboard/CityHeatmap'
import ATMRiskOverview from '../../components/dashboard/ATMRiskOverview'
import RecentCases from '../../components/dashboard/RecentCases'
import FraudCasesTrend from '../../components/dashboard/FraudCasesTrend'
import FraudAmountTrend from '../../components/dashboard/FraudAmountTrend'
import CityFraudComparison from '../../components/dashboard/CityFraudComparison'
import ATMRiskDistribution from '../../components/dashboard/ATMRiskDistribution'
import CasePriorityDistribution from '../../components/dashboard/CasePriorityDistribution'
import { summaryStats } from '../../data/dashboardData'

// Dashboard page. The existing dashboard UI is preserved here so it can
// later sit alongside Active Cases, ATM Risk, Alerts, Reports, and other pages.
export default function App() {
  return (
    <main className="app__content">
          {/* Top row of 4 summary cards */}
          <section className="stat-grid">
            {summaryStats.map((stat) => (
              <StatCard key={stat.id} {...stat} />
            ))}
          </section>

          {/* Active cases + High risk ATMs side by side on large screens */}
          <section className="two-col-grid">
            <ActiveCases />
            <HighRiskATMs />
          </section>

          {/* Full-width heatmap */}
          <section>
            <CityHeatmap />
          </section>

          {/* ATM risk bars + Recent cases side by side on large screens */}
          <section className="two-col-grid">
            <ATMRiskOverview />
            <RecentCases />
          </section>

          <section className="analytics-section">
            <h2 className="analytics-section__title">Analytics</h2>

            <div className="two-col-grid">
              <FraudCasesTrend />
              <FraudAmountTrend />
            </div>

            <section>
              <CityFraudComparison />
            </section>

            <div className="two-col-grid">
              <ATMRiskDistribution />
              <CasePriorityDistribution />
            </div>
          </section>
    </main>
  )
}
