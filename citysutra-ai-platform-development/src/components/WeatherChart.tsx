"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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

export default function WeatherChart({
  time,
  temperature,
  apparent,
  precipitation,
}: {
  time: string[];
  temperature: (number | null)[];
  apparent: (number | null)[];
  precipitation: (number | null)[];
}) {
  const n = time.length;
  const start = Math.max(0, n - 24);
  const data = time.slice(start).map((t, i) => {
    const j = start + i;
    return {
      label: lbl(time[j]),
      temp: temperature[j] ?? null,
      apparent: apparent[j] ?? null,
      rain: precipitation[j] ?? null,
    };
  });
  const maxRain = Math.max(10, ...data.map((d) => d.rain ?? 0));

  return (
    <ResponsiveContainer width="100%" height={230}>
      <ComposedChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: -14 }}>
        <CartesianGrid stroke="#e0e1d8" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#75849a" }}
          minTickGap={30}
          tickLine={false}
          axisLine={{ stroke: "#c9cbc0" }}
        />
        <YAxis
          yAxisId="temp"
          tick={{ fontSize: 10, fill: "#75849a" }}
          tickLine={false}
          axisLine={false}
          width={40}
          unit="°"
        />
        <YAxis yAxisId="rain" orientation="right" domain={[0, maxRain]} hide />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e0e1d8",
            background: "#fbfbf8",
          }}
        />
        <Bar
          yAxisId="rain"
          dataKey="rain"
          fill="#d97706"
          fillOpacity={0.45}
          name="rain (mm)"
          barSize={6}
        />
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="temp"
          stroke="#cf4430"
          strokeWidth={2}
          dot={false}
          connectNulls
          name="temp (°C)"
        />
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="apparent"
          stroke="#b45309"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={false}
          connectNulls
          name="apparent (°C)"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
