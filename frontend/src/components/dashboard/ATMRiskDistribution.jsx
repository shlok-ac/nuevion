import React from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { atmRiskDistribution, chartColors } from '../../data/dashboardData'

export default function ATMRiskDistribution() {
  const total = atmRiskDistribution.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">ATM Risk Distribution</h2>
        <span className="card__total">{total} ATMs monitored</span>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={atmRiskDistribution}
              dataKey="count"
              nameKey="level"
              cx="50%"
              cy="46%"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={2}
            >
              {atmRiskDistribution.map((entry) => (
                <Cell key={entry.level} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [value, `${name} risk`]}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              payload={atmRiskDistribution.map((item) => ({
                value: item.level,
                type: 'circle',
                color: item.color,
              }))}
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
