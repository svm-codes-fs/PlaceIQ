import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Download, Trophy } from "lucide-react";
import { api } from "@/utils/api";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function AdminResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/admin/results")
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = results.filter(r =>
    r.student_name.toLowerCase().includes(search.toLowerCase()) ||
    r.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const exportCsv = () => {
    const cols = ["student_name", "student_roll", "branch", "company_name", "role_offered", "package_lpa", "offer_date", "status"];
    const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...filtered.map((r) => cols.map((c) => quote(r[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: "placement-results.csv" });
    link.click();
    URL.revokeObjectURL(url);
  };

  const accepted = results.filter((r) => r.status === "Accepted").length;

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-5 animate-in fade-in duration-500">

      {/* Compact header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">Placement</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter leading-tight">
            PLACEMENT <span className="text-gradient">OUTCOMES.</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {results.length} offers made · {accepted} accepted
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search results..."
              className="pl-9 pr-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all w-52"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/5 text-white font-bold text-xs tracking-wide rounded-xl hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </header>

      {/* Table */}
      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-600 animate-pulse">Loading outcomes...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center px-6">
            <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center mb-3">
              <Trophy className="w-5 h-5 text-success/40" />
            </div>
            <p className="text-sm font-bold text-gray-400 mb-1">No Placements Yet</p>
            <p className="text-xs text-gray-600">Results will appear here once students accept offers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Student</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Branch</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Company</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Role</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Package</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((res, i) => (
                  <motion.tr
                    key={res.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-success/10 text-success flex items-center justify-center font-bold text-xs border border-success/20 shrink-0">
                          {res.student_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-white">{res.student_name}</p>
                          <p className="text-[10px] text-gray-600">{res.student_roll}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2.5 py-1 bg-white/5 text-gray-400 border border-white/5 rounded-lg text-[10px] font-bold tracking-widest uppercase">
                        {res.branch}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-white">{res.company_name}</td>
                    <td className="px-5 py-3.5 text-sm text-primaryLight font-medium">{res.role_offered}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-success font-bold text-sm">₹{res.package_lpa} <span className="text-xs text-success/60 font-medium">LPA</span></span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={res.status} />
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
