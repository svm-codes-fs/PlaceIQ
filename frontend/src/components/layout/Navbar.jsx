import { Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

export function Navbar({ user, onMenu }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenu}
          aria-label="Open navigation"
          className="-ml-1 rounded-md p-1.5 text-muted hover:bg-slate-100 hover:text-ink lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="truncate text-sm text-muted">
          {user?.college ? (
            <>
              <span className="font-medium text-ink">{user.college.name}</span>
              <span className="hidden sm:inline"> · Placement cell</span>
            </>
          ) : (
            <span className="font-medium text-ink">Platform administration</span>
          )}
        </p>
      </div>
      {user?.role !== "super_admin" && <NotificationBell />}
    </header>
  );
}
