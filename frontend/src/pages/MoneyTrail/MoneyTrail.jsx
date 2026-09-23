import React, { useMemo, useState } from 'react'
import { Background, Controls, Handle, Position, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { activeCases, moneyTrailData } from '../../data/dashboardData'
import { Page, Toast } from '../../components/shared/UI'

function AccountNode({ data }) {
  return <div className={`flow-account ${data.role} ${data.frozen ? 'frozen' : ''}`}><Handle type="target" position={Position.Left} /><strong>{data.label}</strong><small>{data.next ? (data.expanded ? 'Collapse hop' : 'Click to expand') : 'End of chain'}</small>{data.role === 'mule' && <button onClick={event => { event.stopPropagation(); data.onFreeze(data.id) }}>{data.frozen ? 'Frozen silently' : 'Freeze'}</button>}<Handle type="source" position={Position.Right} /></div>
}
const nodeTypes = { account: AccountNode }

export default function MoneyTrail() {
  const [query, setQuery] = useState('CF-1024'); const [expanded, setExpanded] = useState([]); const [frozen, setFrozen] = useState([]); const [toast, setToast] = useState('')
  const roots = moneyTrailData[query] || moneyTrailData['CF-1024']
  const visible = useMemo(() => { const nodes = []; const edges = []; const walk = node => { nodes.push(node); if (node.next && expanded.includes(node.id)) { edges.push({ id: `${node.id}-${node.next.id}`, source: node.id, target: node.next.id, label: '₹75,000 · 23 Sep 18:42', animated: false }); walk(node.next) } }; roots.forEach(walk); return { nodes, edges } }, [roots, expanded])
  const freeze = id => { setFrozen([...frozen, id]); setToast('Silent freeze applied — simulated transactions show processing'); setTimeout(() => setToast(''), 2500) }
  const flowNodes = visible.nodes.map(node => ({ id: node.id, type: 'account', position: { x: node.x * 8, y: node.y * 5 }, data: { ...node, expanded: expanded.includes(node.id), frozen: frozen.includes(node.id), onFreeze: freeze } }))
  return <Page title="Money Trail" subtitle="Expand mule-account chains and trace transaction hops">
    <div className="trail-search"><input value={query} onChange={e => setQuery(e.target.value)} list="case-list" placeholder="Search Case ID or account number" /><datalist id="case-list">{activeCases.map(c => <option key={c.id} value={c.id} />)}</datalist><button onClick={() => setQuery(moneyTrailData[query] ? query : 'CF-1024')}>Load chain</button></div>
    <div className="card graph-card"><div className="graph-legend"><span className="dot victim">Victim</span><span className="dot mule">Mule</span><span className="dot beneficiary">Beneficiary</span></div><div className="react-flow-wrap"><ReactFlow nodes={flowNodes} edges={visible.edges} nodeTypes={nodeTypes} fitView onNodeClick={(_, node) => { if (node.data.next) setExpanded(expanded.includes(node.id) ? expanded.filter(id => id !== node.id) : [...expanded, node.id]) }}><Background /><Controls /></ReactFlow></div><div className="simulation"><b>Transaction simulation</b><span>Attempt a transfer on a frozen mule account:</span><button onClick={() => setToast(frozen.length ? 'Transaction state: processing… (silent freeze)' : 'Freeze a mule account first')}>Simulate transaction</button></div></div><Toast text={toast} />
  </Page>
}
