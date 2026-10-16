import { useState } from "react";

// Single-series line chart of interview scores (0-10) over time.
// Line colour #8b5cf6 validated against the dark surface (dataviz validator: lightness + contrast pass).
const LINE = "#8b5cf6";
const W = 640, H = 200, PAD = { top: 16, right: 16, bottom: 28, left: 32 };

export function ProgressChart({ points }) {
  const [hover, setHover] = useState(null);
  if (points.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        {points.length === 1 ? `First score: ${points[0].score}/10. ` : ""}Complete two interviews to see your trend.
      </p>
    );
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (innerW * i) / (points.length - 1);
  const y = (v) => PAD.top + innerH * (1 - v / 10);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.score)}`).join(" ");
  const fmt = (d) => new Date(d + "Z").toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
        aria-label={`Interview score over ${points.length} sessions, from ${points[0].score} to ${points[points.length - 1].score} out of 10`}>
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#6b7280">{v}</text>
          </g>
        ))}
        <text x={PAD.left} y={H - 8} fontSize="10" fill="#6b7280">{fmt(points[0].date)}</text>
        <text x={W - PAD.right} y={H - 8} fontSize="10" fill="#6b7280" textAnchor="end">{fmt(points[points.length - 1].date)}</text>
        <path d={path} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.id}>
            <circle cx={x(i)} cy={y(p.score)} r={hover === i ? 5 : 4} fill={LINE} stroke="#0f0f16" strokeWidth="2" />
            {/* Larger invisible hit target for hover and keyboard focus */}
            <circle cx={x(i)} cy={y(p.score)} r="14" fill="transparent" tabIndex={0}
              aria-label={`${fmt(p.date)}, ${p.round_type} round: ${p.score} out of 10`}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
          </g>
        ))}
        {/* Direct label on the latest point only */}
        <text x={x(points.length - 1) - 8} y={y(points[points.length - 1].score) - 10} textAnchor="end"
          fontSize="11" fontWeight="700" fill="#e5e7eb">{points[points.length - 1].score}</text>
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-[#14141f] px-3 py-2 text-xs shadow-xl"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(points[hover].score) / H) * 100}%` }}>
          <p className="font-bold text-white">{points[hover].score} / 10</p>
          <p className="text-gray-400 capitalize">{points[hover].round_type} · {fmt(points[hover].date)}</p>
        </div>
      )}
    </figure>
  );
}
