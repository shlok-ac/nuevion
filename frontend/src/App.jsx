import React, { useState } from 'react'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import Dashboard from './pages/Dashboard/Dashboard'
import ATMRisk from './pages/ATMRisk/ATMRisk'
import MoneyTrail from './pages/MoneyTrail/MoneyTrail'
import Alerts from './pages/Alerts/Alerts'
import SuspectDatabase from './pages/SuspectDatabase/SuspectDatabase'
import Reports from './pages/Reports/Reports'
import CaseInvestigation from './pages/CaseInvestigation/CaseInvestigation'

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />
      case 'atm-risk': return <ATMRisk />
      case 'money-trail': return <MoneyTrail />
      case 'alerts': return <Alerts />
      case 'suspect-database': return <SuspectDatabase />
      case 'reports': return <Reports />
      case 'case-investigation': return <CaseInvestigation />
      default:
        // Other pages can be added here as the frontend grows.
        return <Dashboard />
    }
  }

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => {
          setActivePage(page)
          setIsSidebarOpen(false)
        }}
        isOpen={isSidebarOpen}
      />

      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="app__main">
        <Header onMenuClick={() => setIsSidebarOpen((open) => !open)} />
        {renderPage()}
      </div>
    </div>
  )
}
