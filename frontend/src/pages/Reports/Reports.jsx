import React, { useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { activeCases, reportData, trendData } from '../../data/dashboardData'
import { Page, FilterBar, Toast } from '../../components/shared/UI'

function Trends() {
  return <ResponsiveContainer width="100%" height={220}><LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Line type="monotone" dataKey="complaints" name="Complaints filed" stroke="var(--color-blue)" strokeWidth={2} /><Line type="monotone" dataKey="frozen" name="Accounts frozen" stroke="var(--color-green)" strokeWidth={2} /></LineChart></ResponsiveContainer>
}
function Resolution() {
  return <ResponsiveContainer width="100%" height={220}><LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip formatter={value => [`${value} hours`, 'Average resolution']} /><Line type="monotone" dataKey="resolution" name="Average hours" stroke="var(--color-orange)" strokeWidth={2} /></LineChart></ResponsiveContainer>
}

export default function Reports() {
  const [tab, setTab] = useState('Reports'); const [caseId, setCaseId] = useState(activeCases[0].id); const [noticeLog, setNoticeLog] = useState([]); const [toast, setToast] = useState('')
  const c = activeCases.find(x => x.id === caseId)
  const generate = () => { setNoticeLog([{ id: Date.now(), caseId, date: '23 Sep 2026' }, ...noticeLog]); setToast('Notice preview generated'); setTimeout(() => setToast(''), 2000) }
  return <Page title="Reports & Analytics" subtitle="Operational reporting, trends and legal notices">
    <div className="tabs">{['Reports', 'Analytics', 'Legal Notices'].map(x => <button className={tab === x ? 'tab--active' : ''} onClick={() => setTab(x)} key={x}>{x}</button>)}</div>
    {tab === 'Reports' && <><FilterBar><select><option>All cities</option><option>Pune</option><option>Mumbai</option></select><select><option>All case types</option><option>ATM cash-out</option><option>UPI fraud</option></select><button onClick={() => setToast('Report generation queued')}>Generate report</button></FilterBar><div className="card table-wrap"><table><thead><tr><th>Report</th><th>Date range</th><th>City</th><th>Type</th><th>Generated</th><th>Export</th></tr></thead><tbody>{reportData.map(r => <tr key={r.id}><td><b>{r.title}</b><br /><small>{r.id}</small></td><td>{r.range}</td><td>{r.city}</td><td>{r.type}</td><td>{r.generated}</td><td><button className="link-btn">CSV</button> <button className="link-btn">PDF</button></td></tr>)}</tbody></table></div></>}
    {tab === 'Analytics' && <div className="analytics-grid"><section className="card"><h3>Complaints filed vs accounts frozen</h3><Trends /></section><section className="card"><h3>Average case-resolution time (hours)</h3><Resolution /></section></div>}
    {tab === 'Legal Notices' && <div className="notice-layout"><section className="card"><label className="field-label">Select case<select value={caseId} onChange={e => setCaseId(e.target.value)}>{activeCases.map(x => <option key={x.id}>{x.id}</option>)}</select></label><div className="notice-preview"><h3>NOTICE UNDER SECTION 106 BNSS</h3><p>To the concerned account holder,</p><p>In connection with investigation of case <b>{c.id}</b>, involving a reported amount of ₹{c.amount.toLocaleString('en-IN')} in {c.city}, you are directed to preserve and produce relevant transaction records.</p><p>This notice is generated from the case record and requires officer review before issue.</p><p>Assigned officer: {c.officer}</p></div><button onClick={generate}>Generate notice preview</button></section><section className="card"><h3>Generated notice history</h3>{noticeLog.length ? noticeLog.map(n => <p key={n.id}>{n.caseId} · {n.date}</p>) : <p className="muted">No notices generated this session.</p>}</section></div>}
    <Toast text={toast} />
  </Page>
}
