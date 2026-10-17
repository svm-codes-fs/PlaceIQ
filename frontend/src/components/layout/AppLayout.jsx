import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { NotificationsProvider } from "@/utils/notifications";

export function AppLayout({ user, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the page changes
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <NotificationsProvider user={user}>
      <div className="flex h-screen overflow-hidden bg-canvas">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:shrink-0">
          <Sidebar user={user} onLogout={onLogout} />
        </div>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawerOpen(false)} />
            <div className="relative flex h-full">
              <Sidebar user={user} onLogout={onLogout} onNavigate={() => setDrawerOpen(false)} />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="absolute -right-11 top-3 rounded-md bg-white p-1.5 text-ink shadow-pop"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar user={user} onMenu={() => setDrawerOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
