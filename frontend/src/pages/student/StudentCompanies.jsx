import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ArrowRight, Briefcase, AlertCircle } from "lucide-react";
import { api } from "@/utils/api";
import { Alert, errorMessage } from "@/components/ui/Form";
import { StatusBadge } from "@/components/ui/StatusBadge";

const FILTERS = [
  { key: "all", label: "All drives" },
  { key: "eligible", label: "Eligible" },
  { key: "applied", label: "Applied" },
];

export function StudentCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [applyingId, setApplyingId] = useState(null);
  const [message, setMessage] = useState(null);

  const load = () => api.get("/student/companies").then(setCompanies).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleApply = async (company) => {
    setApplyingId(company.id);
    setMessage(null);
    try {
      const data = await api.post(`/student/apply/${company.id}`);
      setMessage({ type: "success", text: data.message });
      await load();
    } catch (err) {
      setMessage({ type: "error", ...errorMessage(err) });
    }
    setApplyingId(null);
  };

  const q = search.toLowerCase();
  const filtered = companies.filter((c) =>
    (c.name.toLowerCase().includes(q) || c.role_offered.toLowerCase().includes(q)) &&
    (filter === "all" ||
      (filter === "eligible" && c.is_eligible && !c.application_status) ||
      (filter === "applied" && c.application_status))
  );

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-5 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">Placement</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter leading-tight">
            OPPORTUNITIES.
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {companies.filter((c) => c.is_eligible).length} of {companies.length} drives match your profile.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-white/5 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all
                  ${filter === f.key ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search companies..."
              aria-label="Search companies"
              className="pl-9 pr-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {message && <Alert type={message.type} items={message.items}>{message.text}</Alert>}

      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-600 animate-pulse">Loading opportunities...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center px-6">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <Briefcase className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-sm font-bold text-gray-400 mb-1">No Opportunities Found</p>
            <p className="text-xs text-gray-600">Try a different filter, or check back when new drives are posted.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((company, i) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 text-white flex items-center justify-center font-bold text-sm group-hover:bg-primary/20 transition-all border border-white/5 shrink-0">
                    {company.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white">{company.name}</p>
                    <p className="text-xs text-primaryLight font-medium">{company.role_offered}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-8 shrink-0">
                    <Stat label="Package" value={<>₹{company.package_lpa} <span className="text-[10px] text-gray-500">LPA</span></>} />
                    <Stat label="Min CGPA" value={`${company.min_cgpa}+`} />
                    <Stat label="Backlogs" value={`≤${company.max_backlogs}`} />
                    <Stat label="Drive" value={company.visit_date ? new Date(company.visit_date).toLocaleDateString() : "TBA"} />
                  </div>
                  <div className="shrink-0 w-28 flex justify-end">
                    {company.application_status ? (
                      <StatusBadge status={company.application_status} />
                    ) : !company.is_eligible ? (
                      <span className="px-3 py-2 text-[10px] uppercase font-bold tracking-widest text-gray-600 border border-white/5 rounded-xl">
                        Ineligible
                      </span>
                    ) : company.status !== "Upcoming" ? (
                      <StatusBadge status={company.status} />
                    ) : (
                      <button
                        onClick={() => handleApply(company)}
                        disabled={applyingId === company.id}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white font-bold text-xs tracking-wide rounded-xl hover:shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)] hover:scale-105 transition-all duration-300 disabled:opacity-50"
                      >
                        {applyingId === company.id ? "Applying..." : "Apply"} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Why can't I apply? */}
                {!company.is_eligible && !company.application_status && (
                  <ul className="mt-3 space-y-1 pl-[3.75rem]">
                    {company.ineligibility_reasons.map((reason) => (
                      <li key={reason} className="flex items-center gap-2 text-[11px] text-gray-500">
                        <AlertCircle className="w-3 h-3 text-danger/70 shrink-0" /> {reason}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
