import React from 'react'

// The list of navigation items shown in the sidebar.
// Kept as a simple array so adding/removing a menu item later is easy.
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'case-investigation', label: 'Case Investigation', icon: '📍' },
  { id: 'atm-risk', label: 'ATM Risk', icon: '🏧' },
  { id: 'money-trail', label: 'Money Trail', icon: '💸' },
  { id: 'alerts', label: 'Alerts', icon: '🔔' },
  { id: 'suspect-database', label: 'Suspect Database', icon: '🗎' },
  { id: 'reports', label: 'Reports', icon: '📊' },
]

// Sidebar is a "controlled" component: it receives the currently active
// page and a function to change it from the parent (App.jsx). This is a
// common beginner-friendly pattern for keeping one piece of shared state
// in a single place instead of duplicating it.
export default function Sidebar({ activePage, onNavigate, isOpen }) {
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar__brand">
        <span className="sidebar__brand-icon">🛡</span>
        <div>
          <div className="sidebar__brand-title">CyberShield</div>
          <div className="sidebar__brand-subtitle">Fraud Command</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar__link ${activePage === item.id ? 'sidebar__link--active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="sidebar__link-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__footer-status">
          <span className="status-dot status-dot--online" />
          System Operational
        </div>
      </div>
    </aside>
  )
}
