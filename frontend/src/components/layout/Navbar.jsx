import { Building2 } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

const ROLE_LABELS = { student: "Student", college_admin: "College Admin", super_admin: "Super Admin" };

export function Navbar({ user }) {
  return (
    <header className="h-20 bg-background/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 flex items-center justify-between px-8 lg:px-12">
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <Building2 className="w-4 h-4 text-gray-600 shrink-0" />
        <p className="text-sm text-gray-400 truncate">{user?.college ? user.college.name : "PlaceIQ platform"}</p>
      </div>

      <div className="flex items-center gap-5">
        {user?.role !== "super_admin" && <NotificationBell />}

        <div className="flex items-center gap-3 pl-5 border-l border-white/10 group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white leading-none tracking-wide">{user?.username}</p>
            <p className="text-xs text-primaryLight uppercase tracking-widest mt-1.5">
              {ROLE_LABELS[user?.role]}{user?.college ? ` · ${user.college.code}` : ""}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-sm shadow-[0_0_15px_-3px_rgba(124,58,237,0.5)] group-hover:scale-105 transition-transform">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
