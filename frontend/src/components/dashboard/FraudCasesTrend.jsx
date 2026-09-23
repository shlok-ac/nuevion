import React from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { fraudCasesTrend, chartColors } from '../../data/dashboardData'

export default function FraudCasesTrend() {
  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">Fraud Cases Trend</h2>
        <span className="card__total">Last 6 months</span>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={fraudCasesTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="casesTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.blue} stopOpacity={0.28} />
                <stop offset="100%" stopColor={chartColors.blue} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fill: chartColors.muted, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: chartColors.border }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: chartColors.muted, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [value, 'Cases']}
            />
            <Area
              type="monotone"
              dataKey="cases"
              stroke={chartColors.blue}
              strokeWidth={2}
              fill="url(#casesTrendFill)"
              name="Cases"
            />
          </AreaChart>
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
