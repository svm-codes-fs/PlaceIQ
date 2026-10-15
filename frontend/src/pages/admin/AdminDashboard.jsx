import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Briefcase, FileText, CheckCircle2, TrendingUp, Award } from "lucide-react";
import { api } from "@/utils/api";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function AdminDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/dashboard").then(setData).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto pt-8 pb-12 space-y-6 animate-pulse">
        <div className="h-24 bg-white/5 rounded-2xl w-1/2" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-7 h-64 bg-white/5 rounded-2xl" />
          <div className="col-span-5 h-64 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { stats, funnel, recent_applications } = data;

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-6 animate-in fade-in duration-500">

      {/* Compact Hero */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div>
          <p className="text-xs font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">
            Good Morning, <span className="text-gray-300">Admin</span>.
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter leading-tight">
            PLACEMENT <span className="text-gradient">SEASON '26.</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 max-w-lg">
            Track every opportunity, application, and outcome at {user?.college?.name || "your campus"}.
          </p>
        </div>
      </header>

      {/* KPI Grid — compact */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Students" value={stats.total_students} icon={Users} />
        <StatCard title="Companies" value={stats.total_companies} icon={Briefcase} />
        <StatCard title="Applications" value={stats.total_applications} icon={FileText} />
        <StatCard
          title="Placement Rate"
          value={`${stats.placement_rate}%`}
          sub={`${stats.placed_students} placed`}
          icon={TrendingUp}
          highlight
        />
      </section>

      {/* Main Content: 2-col */}
      <section className="grid lg:grid-cols-12 gap-5">

        {/* Recent Activity — 7 cols */}
        <div className="lg:col-span-7 glass-panel border border-white/5 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-bold text-white tracking-widest uppercase">Recent Activity</h2>
          </div>
          {recent_applications.length === 0 ? (
            <EmptyState icon={FileText} title="No Recent Activity" sub="Applications will appear here as they come in." />
          ) : (
            <div className="divide-y divide-white/5">
              {recent_applications.map((app, i) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 text-white flex items-center justify-center font-bold text-sm shrink-0 border border-white/5">
                    {app.student_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{app.student_name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      Applied to <span className="text-primaryLight">{app.company_name}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={app.status} />
                    <span className="text-[10px] text-gray-600 tabular-nums w-20 text-right">
                      {new Date(app.date).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* The Funnel — 5 cols */}
        <div className="lg:col-span-5 glass-panel border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-bold text-white tracking-widest uppercase">Recruitment Funnel</h2>
          </div>
          <div className="p-5 space-y-2 relative">
            <div className="absolute left-[2.125rem] top-[2rem] bottom-[1rem] w-px bg-gradient-to-b from-primary/40 via-white/10 to-transparent pointer-events-none" />
            {[
              { icon: FileText,     status: "Applied",     desc: "Submitted, awaiting review." },
              { icon: Users,        status: "Shortlisted", desc: "Selected by the company for interviews." },
              { icon: Briefcase,    status: "Interview",   desc: "Technical & HR rounds in progress." },
              { icon: CheckCircle2, status: "Offered",     desc: "Offer made, waiting for the student." },
              { icon: Award,        status: "Accepted",    desc: "Offer accepted — student placed." },
            ].map((step) => (
              <div key={step.status} className="flex items-start gap-4 group">
                <div className="w-8 h-8 rounded-xl border border-white/10 bg-[#0D0D12] flex items-center justify-center text-gray-500 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-200 shrink-0 z-10">
                  <step.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 py-1">
                  <p className="text-[11px] font-bold text-white tracking-widest uppercase">{step.status}</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
                <p className="py-1 text-xl font-light tabular-nums text-white">{funnel[step.status] || 0}</p>
              </div>
            ))}
          </div>
        </div>

      </section>
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, highlight }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 border transition-all
      ${highlight
        ? 'border-primary/40 bg-primary/10 shadow-[0_0_20px_-8px_rgba(124,58,237,0.4)]'
        : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'}
    `}>
      {highlight && <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-2">{title}</p>
          <p className={`text-3xl font-light tracking-tight ${highlight ? 'text-primaryLight' : 'text-white'}`}>{value}</p>
          {sub && <p className="text-[10px] text-gray-600 mt-1 font-medium">{sub}</p>}
        </div>
        <div className={`p-2 rounded-xl ${highlight ? 'bg-primary/20' : 'bg-white/5'}`}>
          <Icon className={`w-4 h-4 ${highlight ? 'text-primaryLight' : 'text-gray-500'}`} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-6">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <p className="text-sm font-bold text-gray-400 mb-1">{title}</p>
      <p className="text-xs text-gray-600 max-w-xs">{sub}</p>
    </div>
  );
}
