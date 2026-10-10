"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export default function RevenueChart({
  data,
  currency,
}: {
  data: { date: string; revenue: number }[];
  currency: string;
}) {
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart
          data={data}
          margin={{ top: 18, right: 15, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#91b57b" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#91b57b" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#e8eee3"
            strokeDasharray="3 4"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94a08d" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={35}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a08d" }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) =>
              v >= 1000
                ? `${currency}${(v / 1000).toFixed(0)}k`
                : `${currency}${v}`
            }
          />
          <Tooltip
            contentStyle={{
              borderRadius: 9,
              border: "1px solid #e3eadc",
              fontSize: 12,
            }}
            formatter={(value) => [
              currency + Number(value).toLocaleString(),
              "Revenue",
            ]}
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="revenue"
            stroke="#61834e"
            strokeWidth={2.5}
            fill="url(#revenue-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
