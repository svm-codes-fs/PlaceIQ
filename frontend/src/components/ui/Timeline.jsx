import { useEffect, useState } from "react";
import { api } from "@/utils/api";
import { StatusBadge } from "./StatusBadge";

// Audit history of one application, oldest first
export function Timeline({ url }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setEvents(null);
    api.get(url).then(setEvents).catch((err) => setError(err.message));
  }, [url]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!events) return <p className="py-3 text-sm text-muted">Loading history…</p>;
  if (events.length === 0) return <p className="py-3 text-sm text-muted">No history recorded.</p>;

  return (
    <ol className="relative ml-1.5 space-y-4 border-l border-line pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand ring-1 ring-line" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={e.to_status} />
            <span className="text-sm text-muted">
              {e.from_status ? `from ${e.from_status} · ` : ""}by <span className="font-medium text-ink">{e.actor}</span>
              {e.actor_role && e.actor !== "system" ? ` (${e.actor_role.replace("_", " ")})` : ""}
            </span>
          </div>
          <p className="num mt-1 text-xs text-muted">{new Date(e.at + "Z").toLocaleString()}</p>
          {e.note && <p className="mt-1.5 rounded-md bg-slate-50 px-3 py-2 text-sm text-ink">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
