import { useEffect, useState } from "react";
import { api } from "@/utils/api";
import { StatusBadge } from "./StatusBadge";

// Audit history of one application, newest last
export function Timeline({ url }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setEvents(null);
    api.get(url).then(setEvents).catch((err) => setError(err.message));
  }, [url]);

  if (error) return <p className="text-xs text-danger">{error}</p>;
  if (!events) return <p className="py-4 text-xs text-gray-600 animate-pulse">Loading history...</p>;
  if (events.length === 0) return <p className="py-4 text-xs text-gray-600">No history recorded.</p>;

  return (
    <ol className="relative ml-2 space-y-4 border-l border-white/10 py-1 pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#101018] bg-primaryLight" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={e.to_status} />
            <span className="text-[11px] text-gray-500">
              {e.from_status ? `from ${e.from_status} · ` : ""}by {e.actor}
              {e.actor_role && e.actor !== "system" ? ` (${e.actor_role.replace("_", " ")})` : ""}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gray-600">{new Date(e.at + "Z").toLocaleString()}</p>
          {e.note && <p className="mt-1 text-xs text-gray-400">“{e.note}”</p>}
        </li>
      ))}
    </ol>
  );
}
