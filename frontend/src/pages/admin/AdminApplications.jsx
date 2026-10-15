import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, CheckCircle2, FileText } from "lucide-react";

const STATUSES = ['Applied', 'Shortlisted', 'Interview', 'Offered', 'Rejected'];

export function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(null);

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = () => {
    fetch("/api/admin/applications")
      .then((res) => res.json())
      .then((data) => { setApplications(data); setLoading(false); });
  };

  const handleStatusChange = async (appId, newStatus) => {
    setUpdating(appId);
    try {
      const res = await fetch(`/api/admin/applications/${appId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchApplications();
    } catch (err) {
      console.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const filteredApps = applications.filter((a) =>
    a.student_name.toLowerCase().includes(search.toLowerCase()) ||
    a.company_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-5 animate-in fade-in duration-500">

      {/* Compact header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">Placement</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter leading-tight">
            APPLICATION <span className="text-gradient">PIPELINE.</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {applications.length} total · {applications.filter(a => a.result === 'Selected').length} placed
          </p>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search student or company..."
            className="pl-9 pr-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* Table */}
      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-600 animate-pulse">Loading pipeline...</div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center px-6">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-sm font-bold text-gray-400 mb-1">No Applications Found</p>
            <p className="text-xs text-gray-600">Applications will appear here as students apply to drives.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Student</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Company & Role</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Applied</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Pipeline Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredApps.map((app, i) => (
                  <motion.tr
                    key={app.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`group hover:bg-white/[0.02] transition-colors ${updating === app.id ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/5 text-white flex items-center justify-center font-bold text-xs border border-white/5 shrink-0">
                          {app.student_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-white">{app.student_name}</p>
                          <p className="text-[10px] text-gray-600">{app.student_roll}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-white">{app.company_name}</p>
                      <p className="text-[10px] text-primaryLight font-medium">{app.role_offered}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(app.applied_date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      {app.result === 'Selected' ? (
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Placed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 w-fit">
                          {STATUSES.map(s => {
                            const isActive = app.status === s;
                            return (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(app.id, s)}
                                className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap
                                  ${isActive
                                    ? s === 'Rejected'
                                      ? 'bg-danger text-white shadow-md'
                                      : 'bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white shadow-md'
                                    : 'text-gray-500 hover:text-white hover:bg-white/10'
                                  }
                                `}
                              >
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
