import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { cityFraudComparison, chartColors, formatRupees } from '../../data/dashboardData'

export default function CityFraudComparison() {
  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">City-wise Fraud Comparison</h2>
        <span className="card__total">Reported cases</span>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cityFraudComparison} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="city"
              tick={{ fill: chartColors.muted, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: chartColors.border }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: chartColors.muted, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, _name, item) => [
                `${value} cases · ${formatRupees(item.payload.amount)}`,
                item.payload.city,
              ]}
            />
            <Bar dataKey="cases" fill={chartColors.navy} radius={[6, 6, 0, 0]} name="Cases" />
          </BarChart>
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
