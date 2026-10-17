import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

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
    <div className="rounded-md border border-line bg-white p-1.5 shadow-card focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
      <ul className="flex flex-wrap gap-1.5" aria-label={label}>
        {value.map((skill) => (
          <li key={skill} className="flex items-center gap-1 rounded bg-slate-100 py-1 pl-2 pr-1 text-xs font-medium text-ink">
            {skill}
            <button type="button" aria-label={`Remove ${skill}`} onClick={() => onChange(value.filter((s) => s !== skill))}
              className="rounded p-0.5 text-muted hover:bg-slate-200 hover:text-ink">
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
            className="w-full bg-transparent px-1.5 py-1 text-sm text-ink placeholder:text-slate-400 focus:outline-none"
          />
        </li>
      </ul>
    </div>
  );
}

export function SkillChips({ skills, tone = "default" }) {
  const styles = {
    default: "bg-slate-50 text-slate-700 ring-slate-200",
    matched: "bg-green-50 text-green-700 ring-green-200",
    missing: "bg-amber-50 text-amber-800 ring-amber-200",
  };
  if (!skills?.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {skills.map((s) => (
        <li key={s} className={cn("rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset", styles[tone])}>{s}</li>
      ))}
    </ul>
  );
}

// Match score out of 100 with a short bar
export function ScoreBar({ score }) {
  const color = score >= 70 ? "bg-green-600" : score >= 45 ? "bg-brand" : "bg-slate-400";
  return (
    <div className="flex items-center gap-2.5" aria-label={`Match score ${score} out of 100`}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(3, score)}%` }} />
      </div>
      <span className="num w-7 text-right text-sm font-semibold text-ink">{score}</span>
    </div>
  );
}
