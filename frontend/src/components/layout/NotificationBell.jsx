import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotifications } from "@/utils/notifications";

export function NotificationBell() {
  const { items, unread, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative rounded-full p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-96 overflow-hidden rounded-2xl border border-white/10 bg-[#101018] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-white">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] font-bold text-primaryLight hover:text-white">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 divide-y divide-white/5 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-gray-600">You're all caught up.</li>
            ) : items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => { setOpen(false); if (n.link) navigate(n.link); }}
                  className="flex w-full gap-3 px-4 py-3 text-left hover:bg-white/[0.03]"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-xs text-gray-500">{n.body}</span>}
                    <span className="mt-1 block text-[10px] text-gray-600">{new Date(n.created_at + "Z").toLocaleString()}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
