// Live notifications: loads the user's notifications, keeps a Socket.IO
// connection open for new ones, and shows a toast when one arrives.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { api, refreshSession } from "./api";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ user, children }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [socket, setSocket] = useState(null);
  const listeners = useRef(new Set());
  const enabled = user && user.role !== "super_admin";

  const load = useCallback(() => {
    if (!enabled) return;
    api.get("/notifications").then((d) => { setItems(d.items); setUnread(d.unread); }).catch(() => {});
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    load();
    const s = io({ path: "/api/socket.io", withCredentials: true });
    // The access cookie expires every 15 minutes: refresh it, then reconnect (a few tries at most)
    let retries = 0;
    s.on("connect", () => { retries = 0; });
    s.on("connect_error", async () => {
      if (retries++ < 3 && await refreshSession()) setTimeout(() => s.connect(), 500 * retries);
    });
    s.on("notification", (n) => {
      setItems((prev) => [n, ...prev].slice(0, 30));
      setUnread((u) => u + 1);
      const id = `${n.id}-${Date.now()}`;
      setToasts((t) => [...t, { ...n, toastId: id }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.toastId !== id)), 6000);
    });
    s.onAny((event, data) => listeners.current.forEach((fn) => fn(event, data)));
    setSocket(s);
    return () => { s.disconnect(); setSocket(null); };
  }, [enabled, load]);

  const markAllRead = async () => {
    const d = await api.post("/notifications/read", {});
    setItems(d.items);
    setUnread(d.unread);
  };

  // Lets a page react to other socket events (e.g. "import_finished")
  const subscribe = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  return (
    <NotificationsContext.Provider value={{ items, unread, markAllRead, subscribe, connected: !!socket?.connected }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-24 z-[60] flex w-80 flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.toastId}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="pointer-events-auto rounded-2xl border border-primary/30 bg-[#14141f]/95 p-4 shadow-2xl backdrop-blur"
            >
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primaryLight" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">{t.title}</p>
                  {t.body && <p className="mt-0.5 text-xs text-gray-400">{t.body}</p>}
                </div>
                <button aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.toastId !== t.toastId))}
                  className="text-gray-600 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext) || { items: [], unread: 0, markAllRead: () => {}, subscribe: () => () => {} };
}
