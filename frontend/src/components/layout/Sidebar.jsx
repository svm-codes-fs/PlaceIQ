import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Briefcase, FileText, Trophy, BarChart, User, LogOut, Hexagon, Building2, ShieldCheck } from "lucide-react";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import { HOME } from "@/utils/api";

const NAV_SECTIONS = {
  student: [
    { title: "OVERVIEW", items: [{ name: "Dashboard", path: "/student", icon: LayoutDashboard }] },
    {
      title: "PLACEMENT",
      items: [
        { name: "Opportunities", path: "/student/companies", icon: Briefcase },
        { name: "Applications", path: "/student/applications", icon: FileText },
      ]
    },
    { title: "ACCOUNT", items: [{ name: "Profile", path: "/student/profile", icon: User }] }
  ],
  college_admin: [
    { title: "OVERVIEW", items: [{ name: "Dashboard", path: "/admin", icon: LayoutDashboard }] },
    {
      title: "PLACEMENT",
      items: [
        { name: "Applications", path: "/admin/applications", icon: FileText },
        { name: "Results", path: "/admin/results", icon: Trophy },
      ]
    },
    {
      title: "MANAGEMENT",
      items: [
        { name: "Students", path: "/admin/students", icon: Users },
        { name: "Companies", path: "/admin/companies", icon: Briefcase },
        { name: "Policies", path: "/admin/policies", icon: ShieldCheck },
      ]
    },
    { title: "ANALYTICS", items: [{ name: "Reports", path: "/admin/reports", icon: BarChart }] }
  ],
  super_admin: [
    { title: "PLATFORM", items: [{ name: "Colleges", path: "/super", icon: Building2 }] }
  ]
};

export function Sidebar({ user, onLogout }) {
  const location = useLocation();
  const role = user.role;
  const sections = NAV_SECTIONS[role] || [];

  return (
    <aside className="w-56 bg-background/50 backdrop-blur-xl border-r border-white/5 flex flex-col h-screen sticky top-0 left-0 z-40 relative overflow-hidden shrink-0">
      {/* Subtle Sidebar Glow */}
      <div className="absolute top-0 -left-32 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5 relative z-10 border-b border-white/5">
        <Hexagon className="w-5 h-5 text-primary fill-primary/20" />
        <div>
          <h1 className="font-bold text-xs tracking-[0.2em] text-white">PLACEIQ</h1>
          <p className="text-[9px] text-gray-600 tracking-widest uppercase font-bold leading-none mt-0.5">
            {user.college ? user.college.code : "Platform Admin"}
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto relative z-10 space-y-5">
        {sections.map((section, idx) => (
          <div key={idx}>
            <h3 className="px-3 text-[9px] font-bold tracking-[0.15em] text-gray-600 mb-1.5">{section.title}</h3>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== HOME[role] && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-200 group",
                      isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 bg-white/[0.06] border border-white/10 rounded-xl"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <item.icon className={cn(
                      "w-3.5 h-3.5 z-10 relative transition-colors",
                      isActive ? "text-primaryLight" : "text-gray-600 group-hover:text-gray-400"
                    )} />
                    <span className="z-10 relative tracking-wide">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/5 relative z-10">
        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 px-3 py-2 w-full text-left text-xs font-medium text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
        >
          <LogOut className="w-3.5 h-3.5 text-gray-600 group-hover:text-danger transition-colors" />
          <span className="tracking-wide">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
