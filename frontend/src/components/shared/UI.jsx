import React from 'react'

export const levelClass = (value = '') => `level level--${value.toLowerCase()}`
export function Badge({ value }) { return <span className={levelClass(value)}>{value}</span> }
export function Page({ title, subtitle, children }) { return <main className="app__content"><div className="page-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</main> }
export function FilterBar({ children }) { return <div className="filter-bar">{children}</div> }
export function DetailPanel({ title, onClose, children }) { return <div className="panel-backdrop" onClick={onClose}><aside className="detail-panel" onClick={e => e.stopPropagation()}><div className="panel-header"><h3>{title}</h3><button className="icon-btn" onClick={onClose}>×</button></div>{children}</aside></div> }
export function Empty({ text }) { return <div className="empty">{text}</div> }
export function Toast({ text }) { return text ? <div className="toast">{text}</div> : null }
