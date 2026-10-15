import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Briefcase, FileText } from "lucide-react";
import { Link } from "react-router-dom";

export function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/dashboard")
      .then((res) => res.json())
      .then((json) => { setData(json); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-5 animate-pulse">
        <div className="h-20 bg-white/5 rounded-2xl w-2/3" />
        <div className="grid grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  const { student, upcoming_drives, application_stats } = data;

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-6 animate-in fade-in duration-500">

      {/* Compact Hero */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div>
          <p className="text-xs font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">
            Good Morning, <span className="text-gray-300">{student.name.split(' ')[0]}</span>.
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter leading-tight">
            YOUR PLACEMENT <span className="text-gradient">JOURNEY.</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 max-w-lg">
            Your next opportunity could be closer than you think.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">CGPA</p>
            <p className="text-xl font-bold text-white">{student.cgpa}</p>
          </div>
          <div className="w-px h-8 bg-white/10 mx-2" />
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Branch</p>
            <p className="text-sm font-bold text-white">{student.branch}</p>
          </div>
        </div>
      </header>

      {/* Journey Steps Row */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <JourneyCard title="Profile" status="Complete" icon={CheckCircle2} active />
        <JourneyCard title="Eligibility" status={`${student.cgpa} CGPA`} icon={CheckCircle2} active />
        <JourneyCard title="Applications" status={application_stats.total.toString().padStart(2, '0')} icon={FileText} active={application_stats.total > 0} />
        <JourneyCard title="Interviews" status={application_stats.interview.toString().padStart(2, '0')} icon={Briefcase} active={application_stats.interview > 0} />
        <JourneyCard title="Offers" status={application_stats.offered.toString().padStart(2, '0')} icon={CheckCircle2} active={application_stats.offered > 0} highlight={application_stats.offered > 0} />
      </section>

      {/* Opportunities List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white tracking-widest uppercase">Opportunities For You</h2>
          <Link to="/student/companies" className="text-xs font-semibold text-primaryLight hover:text-white transition-colors flex items-center gap-1.5">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
          {upcoming_drives.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center px-6">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                <Briefcase className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-sm font-bold text-gray-400 mb-1">No Upcoming Drives</p>
              <p className="text-xs text-gray-600">Check back later for new recruitment opportunities.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {upcoming_drives.map((drive, i) => (
                <motion.div
                  key={drive.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="group flex items-center gap-5 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 text-white flex items-center justify-center font-bold text-sm group-hover:bg-primary/20 group-hover:border-primary/20 transition-all border border-white/5 shrink-0">
                    {drive.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white">{drive.name}</p>
                    <p className="text-xs text-primaryLight font-medium">{drive.role_offered}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 shrink-0 text-right">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Package</p>
                      <p className="text-sm font-semibold text-white">₹{drive.package_lpa} <span className="text-[10px] text-gray-500">LPA</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">CGPA</p>
                      <p className="text-sm font-semibold text-white">{drive.min_cgpa}+</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Branch</p>
                      <p className="text-sm font-semibold text-white">{drive.branches}</p>
                    </div>
                  </div>
                  <Link
                    to="/student/companies"
                    className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-primary hover:shadow-[0_0_15px_-4px_rgba(124,58,237,0.5)] text-white font-bold text-xs tracking-wide rounded-xl transition-all duration-300 border border-white/5"
                  >
                    View <ArrowRight className="w-3 h-3" />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}

function JourneyCard({ title, status, icon: Icon, active, highlight }) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-4 border transition-all
      ${highlight
        ? 'bg-primary/10 border-primary/40 shadow-[0_0_20px_-8px_rgba(124,58,237,0.4)]'
        : active
          ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]'
          : 'bg-transparent border-white/[0.04] opacity-50'}
    `}>
      {highlight && <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />}
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">{title}</h4>
          <Icon className={`w-3.5 h-3.5 ${highlight ? 'text-primaryLight' : active ? 'text-success' : 'text-gray-700'}`} />
        </div>
        <span className={`text-2xl font-light tracking-tight ${highlight ? 'text-primaryLight' : 'text-white'}`}>
          {status}
        </span>
      </div>
    </div>
  );
}
