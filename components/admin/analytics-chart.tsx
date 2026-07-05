"use client";

import { useId } from "react";

export interface DataPoint {
  label: string;
  value: number;
}

/** Lightweight dependency-free SVG area chart for admin dashboards. */
export function AnalyticsChart({
  data,
  height = 240,
  color = "#C9A96E",
}: {
  data: DataPoint[];
  height?: number;
  color?: string;
}) {
  const gradId = useId();
  const width = 640;
  const pad = 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = (width - pad * 2) / Math.max(1, data.length - 1);

  const points = data.map((d, i) => ({
    x: pad + i * stepX,
    y: height - pad - (d.value / max) * (height - pad * 2),
    ...d,
  }));

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${points[points.length - 1]?.x ?? pad} ${height - pad} L ${pad} ${height - pad} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Analytics chart">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={pad}
          x2={width - pad}
          y1={height - pad - f * (height - pad * 2)}
          y2={height - pad - f * (height - pad * 2)}
          stroke="#E8E2D8"
          strokeDasharray="3 4"
        />
      ))}

      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r={3.5} fill={color} />
          <text x={p.x} y={height - 6} textAnchor="middle" className="fill-[#8C8680] text-[10px]">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Simple horizontal bar list, useful for top products / categories. */
export function BarList({ data, color = "#C9A96E" }: { data: DataPoint[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-elegant-gray">{d.label}</span>
            <span className="text-obsidian">{d.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-beige">
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
