import React from 'react'

// Formats today's date in a readable way, e.g. "23 September 2026".
function getFormattedDate() {
  const today = new Date()
  return today.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function Header({ onMenuClick }) {
  return (
    <header className="header">
      <div className="header__left">
        {/* Hamburger button, only visible on small screens via CSS */}
        <button className="header__menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
          ☰
        </button>
        <div>
          <h1 className="header__title">Cyber Fraud Command Center</h1>
          <p className="header__subtitle">AI-powered monitoring and investigation dashboard</p>
        </div>
      </div>

      <div className="header__right">
        <div className="header__officer">
          <span className="status-dot status-dot--online" />
          Officer Online
        </div>
        <div className="header__date">{getFormattedDate()}</div>
        <button className="header__notification" aria-label="Notifications">
          🔔
          <span className="header__notification-badge">6</span>
        </button>
      </div>
    </header>
  )
}
