// -----------------------------------------------------------------------
// dashboardData.js
//
// This file holds ALL the dummy/static data used across the dashboard.
// In a real system, this data would come from an API. For Version 1
// (frontend shell only), we keep it here so every component can import
// from a single source instead of hard-coding numbers in multiple places.
// -----------------------------------------------------------------------

// Top summary cards shown at the top of the dashboard
export const summaryStats = [
  {
    id: 'active-cases',
    label: 'Active Cases',
    value: '24',
    subtitle: 'Cases under investigation',
    tone: 'blue',
  },
  {
    id: 'high-risk-atms',
    label: 'High Risk ATMs',
    value: '17',
    subtitle: 'Require attention',
    tone: 'orange',
  },
  {
    id: 'fraud-amount',
    label: 'Total Fraud Amount',
    value: '₹12,50,000',
    subtitle: 'Reported amount',
    tone: 'red',
  },
  {
    id: 'critical-alerts',
    label: 'Critical Alerts',
    value: '6',
    subtitle: 'Immediate attention',
    tone: 'red',
  },
]

// Breakdown of active cases by priority, used in the ActiveCases card
export const activeCasesBreakdown = {
  total: 24,
  critical: 6,
  high: 9,
  medium: 9,
}

// High risk ATM table data
export const highRiskATMs = [
  { id: 'ATM-001', location: 'FC Road, Pune', riskScore: 92, fraudCases: 12, level: 'Critical' },
  { id: 'ATM-014', location: 'Andheri East, Mumbai', riskScore: 89, fraudCases: 10, level: 'High' },
  { id: 'ATM-021', location: 'Camp Area, Pune', riskScore: 84, fraudCases: 8, level: 'High' },
  { id: 'ATM-037', location: 'Dadar, Mumbai', riskScore: 81, fraudCases: 7, level: 'High' },
]

// City-level risk data for the heatmap grid
export const cityRisk = [
  { city: 'Mumbai', score: 91 },
  { city: 'Pune', score: 86 },
  { city: 'Nagpur', score: 72 },
  { city: 'Nashik', score: 61 },
  { city: 'Aurangabad', score: 54 },
]

// Recent cases table data
export const recentCases = [
  {
    id: 'CF-1024',
    victim: 'Rahul Sharma',
    amount: '₹75,000',
    city: 'Pune',
    priority: 'Critical',
    status: 'Investigating',
  },
  {
    id: 'CF-1023',
    victim: 'Priya Patil',
    amount: '₹42,000',
    city: 'Mumbai',
    priority: 'High',
    status: 'Pending',
  },
  {
    id: 'CF-1022',
    victim: 'Amit Joshi',
    amount: '₹15,000',
    city: 'Nagpur',
    priority: 'Medium',
    status: 'Investigating',
  },
  {
    id: 'CF-1021',
    victim: 'Sneha Kulkarni',
    amount: '₹90,000',
    city: 'Pune',
    priority: 'Critical',
    status: 'Escalated',
  },
]

// Helper: turns a numeric risk score into a risk level label.
// Used by the heatmap and can be reused anywhere else a score needs a label.
export function scoreToLevel(score) {
  if (score >= 85) return 'Critical'
  if (score >= 70) return 'High'
  if (score >= 55) return 'Medium'
  return 'Low'
}

// Chart colors aligned with the CSS design tokens in styles/App.css.
export const chartColors = {
  navy: '#0f1f3d',
  blue: '#2563eb',
  red: '#dc2626',
  orange: '#ea580c',
  yellow: '#ca8a04',
  green: '#16a34a',
  muted: '#64748b',
  border: '#e2e8f0',
  grid: '#e2e8f0',
}

// Monthly fraud case counts (last 6 months). Totals stay in the same
// range as the dashboard summary so the analytics feel consistent.
export const fraudCasesTrend = [
  { month: 'Apr 2026', cases: 18 },
  { month: 'May 2026', cases: 22 },
  { month: 'Jun 2026', cases: 19 },
  { month: 'Jul 2026', cases: 27 },
  { month: 'Aug 2026', cases: 31 },
  { month: 'Sep 2026', cases: 24 },
]

// Monthly reported fraud amounts in rupees. Sep is the current month
// and lines up with the ₹12,50,000 summary card as year-to-date context.
export const fraudAmountTrend = [
  { month: 'Apr 2026', amount: 165000 },
  { month: 'May 2026', amount: 198000 },
  { month: 'Jun 2026', amount: 142000 },
  { month: 'Jul 2026', amount: 256000 },
  { month: 'Aug 2026', amount: 314000 },
  { month: 'Sep 2026', amount: 175000 },
]

// City-wise case and amount comparison. Cities match the heatmap set;
// higher-risk cities report more cases and higher amounts.
export const cityFraudComparison = [
  { city: 'Mumbai', cases: 38, amount: 420000 },
  { city: 'Pune', cases: 32, amount: 385000 },
  { city: 'Nagpur', cases: 18, amount: 210000 },
  { city: 'Nashik', cases: 12, amount: 135000 },
  { city: 'Aurangabad', cases: 9, amount: 100000 },
]

// ATM risk-level distribution across the monitored fleet (not only the
// 17 high-risk machines shown in the table).
export const atmRiskDistribution = [
  { level: 'Critical', count: 4, color: chartColors.red },
  { level: 'High', count: 13, color: chartColors.orange },
  { level: 'Medium', count: 21, color: chartColors.yellow },
  { level: 'Low', count: 28, color: chartColors.green },
]

// Active-case priority mix. Counts match activeCasesBreakdown (24 total).
export const casePriorityDistribution = [
  { priority: 'Critical', count: 6, color: chartColors.red },
  { priority: 'High', count: 9, color: chartColors.orange },
  { priority: 'Medium', count: 9, color: chartColors.yellow },
]

export function formatRupees(value) {
  return `₹${Number(value).toLocaleString('en-IN')}`
}

export function formatCompactRupees(value) {
  if (value >= 100000) {
    const lakhs = value / 100000
    return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`
  }
  if (value >= 1000) return `₹${Math.round(value / 1000)}K`
  return formatRupees(value)
}
