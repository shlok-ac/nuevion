import React from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { casePriorityDistribution, chartColors } from '../../data/dashboardData'

export default function CasePriorityDistribution() {
  const total = casePriorityDistribution.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">Case Priority Distribution</h2>
        <span className="card__total">{total} active cases</span>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={casePriorityDistribution}
              dataKey="count"
              nameKey="priority"
              cx="50%"
              cy="46%"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={2}
            >
              {casePriorityDistribution.map((entry) => (
                <Cell key={entry.priority} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [value, `${name} priority`]}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              formatter={(value) => <span style={{ color: chartColors.muted, fontSize: 12 }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const tooltipStyle = {
  background: '#ffffff',
  border: `1px solid ${chartColors.border}`,
  borderRadius: 10,
  fontSize: 13,
}
