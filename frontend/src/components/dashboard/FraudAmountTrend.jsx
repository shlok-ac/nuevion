import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import {
  fraudAmountTrend,
  chartColors,
  formatRupees,
  formatCompactRupees,
} from '../../data/dashboardData'

export default function FraudAmountTrend() {
  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">Fraud Amount Trend</h2>
        <span className="card__total">Last 6 months</span>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={fraudAmountTrend} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fill: chartColors.muted, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: chartColors.border }}
            />
            <YAxis
              tickFormatter={formatCompactRupees}
              tick={{ fill: chartColors.muted, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [formatRupees(value), 'Amount']}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke={chartColors.red}
              strokeWidth={2}
              dot={{ r: 4, fill: chartColors.red, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              name="Amount"
            />
          </LineChart>
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
