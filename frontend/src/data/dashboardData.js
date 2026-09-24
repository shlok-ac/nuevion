// -----------------------------------------------------------------------
// dashboardData.js
//
// This file holds ALL the dummy/static data used across the dashboard.
// In a real system, this data would come from an API. For Version 1
// (frontend shell only), we keep it here so every component can import
// from a single source instead of hard-coding numbers in multiple places.
// -----------------------------------------------------------------------

// Top summary cards shown at the top of the dashboard
export const summaryStats = []

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

export const activeCases = [
  { id: 'CF-1024', complainant: 'Rahul Sharma', amount: 75000, bank: 'SBI', city: 'Pune', incidentType: 'UPI fraud', priority: 'Critical', status: 'Investigating', filedTime: '23 Sep 2026, 18:42', summary: 'Victim was induced to approve a remote-support payment request.', officer: 'PI Neha Deshmukh', account: 'XXXX-4481' },
  { id: 'CF-1023', complainant: 'Priya Patil', amount: 42000, bank: 'HDFC Bank', city: 'Mumbai', incidentType: 'Card skimming', priority: 'High', status: 'Pending', filedTime: '23 Sep 2026, 16:10', summary: 'Card details were used at an ATM shortly after a cash withdrawal.', officer: 'PSI Arjun Rao', account: 'XXXX-1290' },
  { id: 'CF-1022', complainant: 'Amit Joshi', amount: 15000, bank: 'ICICI Bank', city: 'Nagpur', incidentType: 'Phishing', priority: 'Medium', status: 'Investigating', filedTime: '22 Sep 2026, 14:25', summary: 'A spoofed KYC link captured internet banking credentials.', officer: 'PI Kavita More', account: 'XXXX-7282' },
  { id: 'CF-1021', complainant: 'Sneha Kulkarni', amount: 90000, bank: 'Axis Bank', city: 'Pune', incidentType: 'Mule account', priority: 'Critical', status: 'Escalated', filedTime: '22 Sep 2026, 09:35', summary: 'Multiple rapid transfers were routed through linked mule accounts.', officer: 'ACP R. Kulkarni', account: 'XXXX-9006' },
  { id: 'CF-1019', complainant: 'Vikram Shah', amount: 28000, bank: 'Kotak Mahindra', city: 'Nashik', incidentType: 'ATM cash-out', priority: 'High', status: 'Investigating', filedTime: '21 Sep 2026, 11:12', summary: 'Cash was withdrawn after the victim reported a lost card.', officer: 'PSI M. Patil', account: 'XXXX-6134' },
]

export const atmRiskData = [
  { id: 'ATM-001', city: 'Pune', location: 'FC Road', locationType: 'Commercial street', lighting: 'Poor', cctv: 'Partial', aviScore: 92, fraudDensity: 12, characteristics: 'Limit ₹25k; older model', level: 'Critical', cases: ['CF-1024', 'CF-1021'] },
  { id: 'ATM-014', city: 'Mumbai', location: 'Andheri East', locationType: 'Transit hub', lighting: 'Moderate', cctv: 'Partial', aviScore: 89, fraudDensity: 10, characteristics: 'Limit ₹40k; cardless enabled', level: 'Critical', cases: ['CF-1023'] },
  { id: 'ATM-021', city: 'Pune', location: 'Camp Area', locationType: 'Residential', lighting: 'Poor', cctv: 'Covered', aviScore: 84, fraudDensity: 8, characteristics: 'Limit ₹20k; older model', level: 'High', cases: ['CF-1021'] },
  { id: 'ATM-037', city: 'Mumbai', location: 'Dadar', locationType: 'Commercial street', lighting: 'Good', cctv: 'Partial', aviScore: 81, fraudDensity: 7, characteristics: 'Limit ₹30k; cardless enabled', level: 'High', cases: [] },
  { id: 'ATM-044', city: 'Nagpur', location: 'Civil Lines', locationType: 'Bank premises', lighting: 'Good', cctv: 'Covered', aviScore: 48, fraudDensity: 3, characteristics: 'Limit ₹40k; newer model', level: 'Low', cases: ['CF-1022'] },
]

export const alertsData = [
  { id: 'AL-301', severity: 'Critical', message: 'Withdrawal attempted on a frozen account — showed processing', timestamp: '23 Sep 2026, 19:02', related: 'CF-1021' },
  { id: 'AL-300', severity: 'Critical', message: 'New Critical case filed', timestamp: '23 Sep 2026, 18:42', related: 'CF-1024' },
  { id: 'AL-299', severity: 'High', message: 'ATM crossed risk threshold', timestamp: '23 Sep 2026, 17:35', related: 'ATM-014' },
  { id: 'AL-298', severity: 'Medium', message: 'Three failed login attempts on mule account', timestamp: '23 Sep 2026, 16:50', related: 'AC-4481' },
  { id: 'AL-297', severity: 'Low', message: 'Daily CCTV health check completed', timestamp: '23 Sep 2026, 15:00', related: 'ATM-044' },
]

export const suspectsData = [
  { id: 'SUS-0448', name: 'Rakesh Verma', phone: '+91 98XXXX2210', account: 'XXXX-4481', linkedCases: ['CF-1024', 'CF-1021'], muleAccounts: ['M-1008', 'M-1012'], flags: ['Rapid cash-out', 'Common device', 'High velocity'], transactions: '14 transactions · ₹2,18,000 in 7 days' },
  { id: 'SUS-0312', name: 'Unknown beneficiary', phone: '+91 97XXXX9012', account: 'XXXX-1290', linkedCases: ['CF-1023'], muleAccounts: ['M-1104'], flags: ['ATM concentration'], transactions: '6 transactions · ₹82,000 in 3 days' },
  { id: 'SUS-0189', name: 'Sanjay Pawar', phone: '+91 99XXXX7344', account: 'XXXX-6134', linkedCases: ['CF-1019'], muleAccounts: ['M-1088'], flags: ['SIM swap'], transactions: '9 transactions · ₹1,02,000 in 14 days' },
]

export const reportData = [
  { id: 'RPT-090', title: 'Weekly fraud situation report', range: '16–22 Sep 2026', city: 'All cities', type: 'All types', generated: '23 Sep 2026' },
  { id: 'RPT-089', title: 'Pune ATM cash-out analysis', range: '01–22 Sep 2026', city: 'Pune', type: 'ATM cash-out', generated: '22 Sep 2026' },
]

export const trendData = [
  { label: '18 Sep', complaints: 8, frozen: 3, resolution: 42 },
  { label: '19 Sep', complaints: 11, frozen: 5, resolution: 38 },
  { label: '20 Sep', complaints: 9, frozen: 4, resolution: 45 },
  { label: '21 Sep', complaints: 14, frozen: 8, resolution: 35 },
  { label: '22 Sep', complaints: 12, frozen: 7, resolution: 31 },
  { label: '23 Sep', complaints: 16, frozen: 10, resolution: 28 },
]

export const moneyTrailData = {
  'CF-1024': [
    { id: 'victim-1024', label: 'Victim · XXXX-4481', role: 'victim', x: 8, y: 48 },
    { id: 'mule-1008', label: 'Mule · XXXX-7812', role: 'mule', x: 36, y: 48, next: { id: 'mule-1009', label: 'Mule · XXXX-9034', role: 'mule', x: 64, y: 28, next: { id: 'beneficiary-1', label: 'Beneficiary · XXXX-2221', role: 'beneficiary', x: 88, y: 28 } } },
  ],
  'CF-1021': [
    { id: 'victim-1021', label: 'Victim · XXXX-9006', role: 'victim', x: 8, y: 48 },
    { id: 'mule-1012', label: 'Mule · XXXX-1188', role: 'mule', x: 38, y: 48, next: { id: 'beneficiary-2', label: 'Beneficiary · XXXX-6620', role: 'beneficiary', x: 72, y: 48 } },
  ],
}
