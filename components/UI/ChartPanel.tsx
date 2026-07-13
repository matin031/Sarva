"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";

const data = [
  { day: "شنبه", value: 42 },
  { day: "یکشنبه", value: 58 },
  { day: "دوشنبه", value: 51 },
  { day: "سه‌شنبه", value: 67 },
  { day: "چهارشنبه", value: 64 },
  { day: "پنجشنبه", value: 78 },
  { day: "جمعه", value: 85 },
];

function ProgressChart({ data }: { data: { day: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="oklch(0.28 0.025 260)"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          tick={{ fill: "oklch(0.7 0.02 85)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={0}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(0.18 0.025 260)",
            border: "1px solid oklch(0.28 0.025 260)",
            borderRadius: "12px",
            color: "oklch(0.95 0.01 85)",
            fontSize: "13px",
            direction: "rtl",
          }}
          formatter={(value) => [`${value}٪`, "دقت"] as [string, string]}
          cursor={{ stroke: "oklch(0.65 0.12 195 / 0.3)", strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="oklch(0.65 0.12 195)"
          strokeWidth={2.5}
          dot={(props) => {
            const { cx, cy } = props;
            return (
              <circle
                key={`dot-${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r={5}
                fill="oklch(0.18 0.025 260)"
                stroke="oklch(0.65 0.12 195)"
                strokeWidth={2.5}
              />
            );
          }}
          activeDot={{
            r: 7,
            fill: "oklch(0.65 0.12 195)",
            stroke: "oklch(0.18 0.025 260)",
            strokeWidth: 2,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default ProgressChart;
