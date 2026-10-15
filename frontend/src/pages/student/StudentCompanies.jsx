import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ArrowRight, Briefcase } from "lucide-react";

export function StudentCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [applyingId, setApplyingId] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch("/api/student/companies")
      .then(res => res.json())
      .then(data => { setCompanies(data); setLoading(false); });
  }, []);

  const handleApply = async (companyId) => {
    setApplyingId(companyId);
    setMessage(null);
    try {
      const res = await fetch(`/api/student/apply/${companyId}`, { method: "POST" });
      const data = await res.json();
      setMessage({ type: res.ok ? "success" : "error", text: data.message || data.error });
      if (res.ok) setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, applied: true } : c));
    } catch { setMessage({ type: "error", text: "Application failed." }); }
    setApplyingId(null);
  };

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.role_offered.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-5 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">Placement</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter leading-tight">
            OPPORTUNITIES.
          </h1>
          <p className="text-sm text-gray-500 mt-1">Showing drives you are eligible for.</p>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search companies..."
            className="pl-9 pr-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all w-56"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-xs font-bold border ${message.type === "success" ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger"}`}>
          {message.text}
        </div>
      )}

      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-600 animate-pulse">Loading opportunities...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center px-6">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <Briefcase className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-sm font-bold text-gray-400 mb-1">No Opportunities Found</p>
            <p className="text-xs text-gray-600">Update your profile to improve eligibility, or check back later.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((company, i) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="group flex items-center gap-5 px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 text-white flex items-center justify-center font-bold text-sm group-hover:bg-primary/20 group-hover:border-primary/20 transition-all border border-white/5 shrink-0">
                  {company.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white">{company.name}</p>
                  <p className="text-xs text-primaryLight font-medium">{company.role_offered}</p>
                </div>
                <div className="hidden md:flex items-center gap-8 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Package</p>
                    <p className="text-sm font-semibold text-white">₹{company.package_lpa} <span className="text-[10px] text-gray-500">LPA</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Min CGPA</p>
                    <p className="text-sm font-semibold text-white">{company.min_cgpa}+</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">Backlogs</p>
                    <p className="text-sm font-semibold text-white">≤{company.max_backlogs}</p>
                  </div>
                </div>
                <div className="shrink-0">
                  {company.applied ? (
                    <span className="px-4 py-2 text-[10px] uppercase font-bold tracking-widest text-success border border-success/30 bg-success/10 rounded-xl">
                      ✓ Applied
                    </span>
                  ) : !company.eligible ? (
                    <span className="px-4 py-2 text-[10px] uppercase font-bold tracking-widest text-gray-600 border border-white/5 rounded-xl">
                      Ineligible
                    </span>
                  ) : (
                    <button
                      onClick={() => handleApply(company.id)}
                      disabled={applyingId === company.id}
                      className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white font-bold text-xs tracking-wide rounded-xl hover:shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)] hover:scale-105 transition-all duration-300 disabled:opacity-50"
                    >
                      {applyingId === company.id ? "Applying..." : "Apply"} <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
