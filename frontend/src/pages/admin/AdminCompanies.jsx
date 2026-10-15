import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Briefcase, ArrowUpRight } from "lucide-react";

export function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/companies")
      .then(res => res.json())
      .then(data => { setCompanies(data); setLoading(false); });
  }, []);

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.role_offered.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-5 animate-in fade-in duration-500">

      {/* Compact header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">Management</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter leading-tight">
            RECRUITMENT <span className="text-gradient">DRIVES.</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {companies.length} {companies.length === 1 ? 'drive' : 'drives'} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search drives..."
              className="pl-9 pr-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white font-bold text-xs tracking-wide rounded-xl hover:shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)] transition-all">
            <Plus className="w-3.5 h-3.5" /> Add Drive
          </button>
        </div>
      </header>

      {/* Table */}
      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center py-12 text-center animate-pulse">
            <p className="text-sm text-gray-600">Loading drives...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center px-6">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <Briefcase className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-sm font-bold text-gray-400 mb-1">No Drives Found</p>
            <p className="text-xs text-gray-600 max-w-xs">
              {search ? 'No drives match your search.' : 'Add a recruitment drive to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Company</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Role</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Package</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Min CGPA</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Drive Date</th>
                  <th className="px-5 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((company, i) => (
                  <motion.tr
                    key={company.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/5 text-white flex items-center justify-center font-bold text-xs border border-white/5 group-hover:bg-primary/20 group-hover:border-primary/30 transition-all shrink-0">
                          {company.name.charAt(0)}
                        </div>
                        <p className="font-semibold text-sm text-white">{company.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-primaryLight font-medium">{company.role_offered}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-white">₹{company.package_lpa} <span className="text-xs text-gray-600">LPA</span></td>
                    <td className="px-5 py-3.5 text-sm text-white font-medium">{company.min_cgpa}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border
                        ${company.status === 'Upcoming' ? 'bg-primary/20 text-primaryLight border-primary/30' :
                          company.status === 'Ongoing' ? 'bg-warning/20 text-warning border-warning/30' :
                          'bg-white/5 text-gray-500 border-white/10'}
                      `}>
                        {company.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {company.visit_date ? new Date(company.visit_date).toLocaleDateString() : 'TBD'}
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="p-1.5 text-gray-600 hover:text-primaryLight transition-colors rounded-lg hover:bg-white/5">
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
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
