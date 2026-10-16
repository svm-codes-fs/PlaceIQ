import { useState } from "react";
import { X } from "lucide-react";

// Chip-style editor for a list of skills
export function SkillInput({ value, onChange, placeholder = "Add a skill and press Enter", label = "Skills" }) {
  const [draft, setDraft] = useState("");

  const add = (raw) => {
    const parts = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const existing = new Set(value.map((s) => s.toLowerCase()));
    const next = [...value];
    parts.forEach((p) => { if (!existing.has(p.toLowerCase())) { next.push(p); existing.add(p.toLowerCase()); } });
    onChange(next);
    setDraft("");
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
      <ul className="flex flex-wrap gap-1.5" aria-label={label}>
        {value.map((skill) => (
          <li key={skill} className="flex items-center gap-1 rounded-lg bg-primary/20 py-1 pl-2.5 pr-1 text-xs font-semibold text-white">
            {skill}
            <button type="button" aria-label={`Remove ${skill}`} onClick={() => onChange(value.filter((s) => s !== skill))}
              className="rounded p-0.5 text-white/60 hover:bg-white/10 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
        <li className="min-w-[10rem] flex-1">
          <input
            value={draft}
            aria-label={`Add to ${label.toLowerCase()}`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === ",") && draft.trim()) { e.preventDefault(); add(draft); }
              if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
            }}
            onBlur={() => draft.trim() && add(draft)}
            placeholder={value.length ? "" : placeholder}
            className="w-full bg-transparent px-1.5 py-1 text-sm text-white placeholder:text-gray-600 focus:outline-none"
          />
        </li>
      </ul>
    </div>
  );
}

export function SkillChips({ skills, tone = "default" }) {
  const styles = {
    default: "bg-white/5 text-gray-300 border-white/10",
    matched: "bg-success/10 text-success border-success/20",
    missing: "bg-warning/10 text-warning border-warning/20",
  };
  if (!skills?.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {skills.map((s) => (
        <li key={s} className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${styles[tone]}`}>{s}</li>
      ))}
    </ul>
  );
}

export function ScoreBar({ score }) {
  const color = score >= 70 ? "bg-success" : score >= 45 ? "bg-primary" : "bg-gray-500";
  return (
    <div className="flex items-center gap-2" aria-label={`Match score ${score} out of 100`}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, score)}%` }} />
      </div>
      <span className="w-8 text-right text-sm font-bold tabular-nums text-white">{score}</span>
    </div>
  );
}
