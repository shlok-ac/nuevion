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
