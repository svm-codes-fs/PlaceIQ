import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Filter, MoreHorizontal, CheckCircle2, Users } from "lucide-react";

export function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/students")
      .then(res => res.json())
      .then(data => { setStudents(data); setLoading(false); });
  }, []);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_no.toLowerCase().includes(search.toLowerCase()) ||
    s.branch.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-5 animate-in fade-in duration-500">

      {/* Compact header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">Management</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter leading-tight">
            STUDENT <span className="text-gradient">DIRECTORY.</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {students.length} students registered · {students.filter(s => s.placement_status === 'Placed').length} placed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search students..."
              className="pl-9 pr-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="p-2.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Table */}
      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Student</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Branch</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">CGPA</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Backlogs</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Status</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="6" className="px-5 py-10 text-center text-gray-600 text-sm animate-pulse">Loading directory...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="flex flex-col items-center py-10 text-center px-6">
                      <Users className="w-8 h-8 text-gray-700 mb-2" />
                      <p className="text-sm font-bold text-gray-400">No students found</p>
                      <p className="text-xs text-gray-600 mt-1">Try adjusting your search query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, i) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/5 text-white flex items-center justify-center font-bold text-xs group-hover:bg-primary group-hover:shadow-[0_0_12px_-4px_rgba(124,58,237,0.6)] transition-all border border-white/5 shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-white">{student.name}</p>
                          <p className="text-[10px] text-gray-600 tracking-widest">{student.roll_no}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2.5 py-1 bg-white/5 text-gray-400 border border-white/5 rounded-lg text-[10px] font-bold tracking-widest uppercase">
                        {student.branch}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-white">{student.cgpa}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-sm font-semibold ${student.backlogs > 0 ? 'text-danger' : 'text-gray-500'}`}>
                        {student.backlogs}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {student.placement_status === 'Placed' ? (
                        <span className="inline-flex items-center gap-1 text-success text-[10px] font-bold uppercase tracking-widest">
                          <CheckCircle2 className="w-3 h-3" /> Placed
                        </span>
                      ) : (
                        <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Unplaced</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="p-1.5 text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
