import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, CheckCircle2, FileText, BarChart2 } from "lucide-react";

export function AdminReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reports")
      .then(res => res.json())
      .then(data => { setReport(data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-5 animate-pulse">
        <div className="h-16 bg-white/5 rounded-2xl w-1/3" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  const unplaced = report.overview.total_students - report.overview.placed_students;
  const maxRate = Math.max(...report.branch_metrics.map(b => b.rate), 1);

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-5 animate-in fade-in duration-500">

      {/* Compact header */}
      <header>
        <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">Analytics</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter leading-tight">
          ANALYTICS & <span className="text-gradient">REPORTS.</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">Campus placement performance at a glance.</p>
      </header>

      {/* KPI row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={TrendingUp} label="Placement Rate" value={`${report.overview.overall_rate}%`} color="primary" />
        <MiniStat icon={Users} label="Total Students" value={report.overview.total_students} />
        <MiniStat icon={CheckCircle2} label="Placed" value={report.overview.placed_students} color="success" />
        <MiniStat icon={FileText} label="Unplaced" value={unplaced} color={unplaced > 0 ? "warning" : "success"} />
      </section>

      {/* Branch Performance */}
      <section className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
          <BarChart2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-white tracking-widest uppercase">Branch Performance</h2>
        </div>

        {report.branch_metrics.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center px-6">
            <p className="text-sm font-bold text-gray-400 mb-1">No Branch Data</p>
            <p className="text-xs text-gray-600">Branch metrics will appear once students are enrolled.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {report.branch_metrics.map((bm, i) => (
              <motion.div
                key={bm.branch}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-5 px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-14 shrink-0">
                  <span className="text-xs font-bold text-white tracking-wider">{bm.branch}</span>
                </div>

                <div className="flex-1">
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(bm.rate / maxRate) * 100}%` }}
                      transition={{ duration: 1, delay: 0.2 + i * 0.07, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-right">
                  <span className="text-xs text-gray-500 tabular-nums">{bm.placed}/{bm.total}</span>
                  <span className="text-sm font-bold text-primaryLight tabular-nums w-12 text-right">{bm.rate}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }) {
  const colorMap = {
    primary: { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primaryLight', icon: 'text-primary' },
    success: { bg: 'bg-success/10', border: 'border-success/20', text: 'text-success', icon: 'text-success' },
    warning: { bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning', icon: 'text-warning' },
    default: { bg: 'bg-white/[0.03]', border: 'border-white/5', text: 'text-white', icon: 'text-gray-500' },
  };
  const c = colorMap[color] || colorMap.default;

  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 border ${c.bg} ${c.border} transition-all`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-2">{label}</p>
          <p className={`text-3xl font-light tracking-tight ${c.text}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-xl ${c.bg}`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
      </div>
    </div>
  );
}
