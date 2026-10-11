"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function lbl(t: string) {
  return new Date(t).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

export default function AirChart({
  time,
  aqi,
}: {
  time: string[];
  aqi: (number | null)[];
}) {
  const n = time.length;
  const start = Math.max(0, n - 48);
  const data = time.slice(start).map((t, i) => ({
    label: lbl(time[start + i]),
    aqi: aqi[start + i] ?? null,
  }));
  const maxV = Math.max(150, ...data.map((d) => d.aqi ?? 0));

  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4356c6" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#4356c6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e0e1d8" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#75849a" }}
          minTickGap={30}
          tickLine={false}
          axisLine={{ stroke: "#c9cbc0" }}
        />
        <YAxis
          domain={[0, maxV]}
          tick={{ fontSize: 10, fill: "#75849a" }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e0e1d8",
            background: "#fbfbf8",
          }}
        />
        <ReferenceLine
          y={100}
          stroke="#cf4430"
          strokeDasharray="4 4"
          label={{ value: "100 · elevated", fontSize: 10, fill: "#a53322", position: "insideTopRight" }}
        />
        <Area
          type="monotone"
          dataKey="aqi"
          stroke="#4356c6"
          strokeWidth={2}
          fill="url(#aqiFill)"
          connectNulls
          dot={false}
          name="AQI"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
