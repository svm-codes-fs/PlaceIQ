import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, FileText, Trophy, BarChart3, User, LogOut, Building2, ShieldCheck,
  Sparkles, ScrollText, MessagesSquare, GraduationCap,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { HOME } from "@/utils/api";

const NAV_SECTIONS = {
  student: [
    { title: "Overview", items: [{ name: "Dashboard", path: "/student", icon: LayoutDashboard }] },
    {
      title: "Placement",
      items: [
        { name: "Job matches", path: "/student/matches", icon: Sparkles },
        { name: "Opportunities", path: "/student/companies", icon: Briefcase },
        { name: "Applications", path: "/student/applications", icon: FileText },
        { name: "Mock interviews", path: "/student/interviews", icon: MessagesSquare },
      ]
    },
    {
      title: "Account",
      items: [
        { name: "Resume & skills", path: "/student/resume", icon: ScrollText },
        { name: "Profile", path: "/student/profile", icon: User },
      ]
    }
  ],
  college_admin: [
    { title: "Overview", items: [{ name: "Dashboard", path: "/admin", icon: LayoutDashboard }] },
    {
      title: "Placement",
      items: [
        { name: "Applications", path: "/admin/applications", icon: FileText },
        { name: "Results", path: "/admin/results", icon: Trophy },
      ]
    },
    {
      title: "Management",
      items: [
        { name: "Students", path: "/admin/students", icon: Users },
        { name: "Companies", path: "/admin/companies", icon: Briefcase },
        { name: "Policies", path: "/admin/policies", icon: ShieldCheck },
      ]
    },
    { title: "Analytics", items: [{ name: "Reports", path: "/admin/reports", icon: BarChart3 }] }
  ],
  super_admin: [
    { title: "Platform", items: [{ name: "Colleges", path: "/super", icon: Building2 }] }
  ]
};

const ROLE_LABELS = { student: "Student", college_admin: "College admin", super_admin: "Super admin" };

export function Sidebar({ user, onLogout, onNavigate }) {
  const location = useLocation();
  const role = user.role;
  const sections = NAV_SECTIONS[role] || [];

  return (
    <aside className="flex h-full w-64 flex-col bg-navy text-slate-300">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-white">
          <GraduationCap className="h-4 w-4" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-semibold text-white">PlaceIQ</p>
          <p className="truncate text-2xs text-slate-400">{user.college ? user.college.name : "Platform administration"}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Main">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== HOME[role] && location.pathname.startsWith(item.path));
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {isActive && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-blue-400" aria-hidden="true" />}
                      <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-300" : "text-slate-400")} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Signed-in user */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {user.username?.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-white">{user.username}</p>
            <p className="truncate text-2xs text-slate-400">{ROLE_LABELS[role]}{user.college ? ` · ${user.college.code}` : ""}</p>
          </div>
          <button
            onClick={onLogout}
            aria-label="Sign Out"
            title="Sign out"
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
