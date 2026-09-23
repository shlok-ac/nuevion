import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import StatCard from './components/StatCard'
import ActiveCases from './components/ActiveCases'
import HighRiskATMs from './components/HighRiskATMs'
import CityHeatmap from './components/CityHeatmap'
import ATMRiskOverview from './components/ATMRiskOverview'
import RecentCases from './components/RecentCases'
import { summaryStats } from './data/dashboardData'

// App.jsx is the top-level layout. It owns two small pieces of state:
// 1. which sidebar item is "active" (for highlighting)
// 2. whether the sidebar is open on mobile (since it collapses on small screens)
// Version 1 only builds out the "Dashboard" page content; the other
// sidebar links are wired up but don't have their own pages yet.
export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => {
          setActivePage(page)
          setIsSidebarOpen(false) // close mobile menu after picking a page
        }}
        isOpen={isSidebarOpen}
      />

      {/* Dark overlay behind the sidebar on mobile when it's open */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}

      <div className="app__main">
        <Header onMenuClick={() => setIsSidebarOpen((open) => !open)} />

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
        </main>
      </div>
    </div>
  )
}
