import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Briefcase, Pencil, Trash2, Users, Sparkles } from "lucide-react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert, Field, GhostButton, PrimaryButton, Select, TextInput, errorMessage } from "@/components/ui/Form";
import { SkillInput } from "@/components/ui/SkillInput";
import { CompanyCandidates } from "./CompanyCandidates";

const BRANCHES = ["CSE", "ECE", "ME", "CE", "EE", "CHE"];
const STATUSES = ["Upcoming", "Ongoing", "Completed"];
const EMPTY = {
  name: "", role_offered: "", description: "", package_lpa: "", min_cgpa: "0", max_backlogs: "0",
  allowed_branches: [...BRANCHES], required_skills: [], visit_date: "", status: "Upcoming",
};

export function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [eligibleFor, setEligibleFor] = useState(null);
  const [candidatesFor, setCandidatesFor] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = () => api.get("/admin/companies").then(setCompanies).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const remove = async (company) => {
    if (!window.confirm(`Delete the ${company.name} drive? Its ${company.applicant_count} application(s) are removed too.`)) return;
    try {
      const data = await api.del(`/admin/companies/${company.id}`);
      setNotice({ type: "success", text: data.message });
      load();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  const q = search.toLowerCase();
  const filtered = companies.filter(c => c.name.toLowerCase().includes(q) || c.role_offered.toLowerCase().includes(q));

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-5 animate-in fade-in duration-500">

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
              aria-label="Search drives"
              className="pl-9 pr-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <PrimaryButton onClick={() => setEditing({})}>
            <Plus className="w-3.5 h-3.5" /> Add Drive
          </PrimaryButton>
        </div>
      </header>

      {notice && <Alert type={notice.type}>{notice.text}</Alert>}

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
                  {["Company", "Role", "Package", "Criteria", "Applicants", "Status", "Drive Date", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">{h}</th>
                  ))}
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
                    <td className="px-5 py-3.5 text-sm font-semibold text-white whitespace-nowrap">₹{company.package_lpa} <span className="text-xs text-gray-600">LPA</span></td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      <p>CGPA ≥ {company.min_cgpa} · Backlogs ≤ {company.max_backlogs}</p>
                      <p className="text-[10px] text-gray-600">{company.allowed_branches.join(", ")}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-white">{company.applicant_count}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={company.status} /></td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {company.visit_date ? new Date(company.visit_date).toLocaleDateString() : 'TBD'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setCandidatesFor(company)} aria-label={`Top candidates for ${company.name}`} title="Top candidates (AI match)"
                          className="p-1.5 text-gray-600 hover:text-primaryLight transition-colors rounded-lg hover:bg-white/10">
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEligibleFor(company)} aria-label={`Eligible students for ${company.name}`} title="Eligible students"
                          className="p-1.5 text-gray-600 hover:text-primaryLight transition-colors rounded-lg hover:bg-white/10">
                          <Users className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditing(company)} aria-label={`Edit ${company.name}`}
                          className="p-1.5 text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => remove(company)} aria-label={`Delete ${company.name}`}
                          className="p-1.5 text-gray-600 hover:text-danger transition-colors rounded-lg hover:bg-danger/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CompanyForm
        company={editing}
        onClose={() => setEditing(null)}
        onSaved={(text) => { setEditing(null); setNotice({ type: "success", text }); load(); }}
      />
      <EligibleStudents company={eligibleFor} onClose={() => setEligibleFor(null)} />
      <CompanyCandidates company={candidatesFor} onClose={() => setCandidatesFor(null)} />
    </div>
  );
}

function CompanyForm({ company, onClose, onSaved }) {
  const isNew = company && !company.id;
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setError(null);
    if (company) {
      setForm(isNew ? EMPTY : {
        ...EMPTY, ...company,
        description: company.description || "",
        visit_date: company.visit_date || "",
        package_lpa: String(company.package_lpa),
        min_cgpa: String(company.min_cgpa),
        max_backlogs: String(company.max_backlogs),
      });
    }
  }, [company, isNew]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleBranch = (b) => setForm((f) => ({
    ...f,
    allowed_branches: f.allowed_branches.includes(b)
      ? f.allowed_branches.filter((x) => x !== b)
      : [...f.allowed_branches, b],
  }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { name, role_offered, description, package_lpa, min_cgpa, max_backlogs, allowed_branches, required_skills, visit_date, status } = form;
    const body = { name, role_offered, description, package_lpa, min_cgpa, max_backlogs, allowed_branches, required_skills, visit_date, status };
    try {
      if (isNew) await api.post("/admin/companies", body);
      else await api.put(`/admin/companies/${company.id}`, body);
      onSaved(isNew ? `Added the ${name} drive.` : `Updated ${name}.`);
    } catch (err) {
      setError(errorMessage(err));
    }
    setSaving(false);
  };

  return (
    <Modal open={!!company} onClose={onClose} title={isNew ? "Add recruitment drive" : `Edit ${company?.name}`}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert items={error.items}>{error.text}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company"><TextInput required value={form.name} onChange={set("name")} /></Field>
          <Field label="Role offered"><TextInput required value={form.role_offered} onChange={set("role_offered")} /></Field>
          <Field label="Package (LPA)"><TextInput required type="number" step="0.01" min="0" value={form.package_lpa} onChange={set("package_lpa")} /></Field>
          <Field label="Drive date"><TextInput type="date" value={form.visit_date} onChange={set("visit_date")} /></Field>
          <Field label="Minimum CGPA"><TextInput required type="number" step="0.01" min="0" max="10" value={form.min_cgpa} onChange={set("min_cgpa")} /></Field>
          <Field label="Maximum backlogs"><TextInput required type="number" min="0" value={form.max_backlogs} onChange={set("max_backlogs")} /></Field>
          <Field label="Status"><Select value={form.status} onChange={set("status")} options={STATUSES} /></Field>
        </div>
        <fieldset className="space-y-1.5">
          <legend className="ml-1 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Allowed branches</legend>
          <div className="flex flex-wrap gap-2">
            {BRANCHES.map((b) => {
              const on = form.allowed_branches.includes(b);
              return (
                <button key={b} type="button" aria-pressed={on} onClick={() => toggleBranch(b)}
                  className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold tracking-widest transition-all
                    ${on ? "border-primary/50 bg-primary/20 text-white" : "border-white/10 text-gray-500 hover:text-white"}`}>
                  {b}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Field label="Required skills" hint="Used to rank candidates and show students which skills they're missing">
          <SkillInput value={form.required_skills} onChange={(v) => setForm((f) => ({ ...f, required_skills: v }))} label="Required skills" />
        </Field>
        <Field label="Description (optional)">
          <textarea rows={3} value={form.description} onChange={set("description")}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving..." : isNew ? "Add drive" : "Save changes"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function EligibleStudents({ company, onClose }) {
  const [students, setStudents] = useState(null);

  useEffect(() => {
    setStudents(null);
    if (company) api.get(`/admin/companies/${company.id}/eligible`).then((d) => setStudents(d.students));
  }, [company]);

  return (
    <Modal open={!!company} onClose={onClose} wide
      title={`Eligible for ${company?.name || ""}`}
      subtitle={company && `CGPA ≥ ${company.min_cgpa}, backlogs ≤ ${company.max_backlogs}, branches ${company.allowed_branches.join(", ")}`}>
      {!students ? (
        <p className="py-8 text-center text-sm text-gray-600 animate-pulse">Loading...</p>
      ) : students.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No students currently meet these criteria.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              {["Student", "Branch", "CGPA", "Backlogs", "Status"].map((h) => (
                <th key={h} className="py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="py-2.5 text-sm text-white">{s.name} <span className="text-[10px] text-gray-600">{s.roll_no}</span></td>
                <td className="py-2.5 text-xs text-gray-400">{s.branch}</td>
                <td className="py-2.5 text-sm text-white">{s.cgpa.toFixed(2)}</td>
                <td className="py-2.5 text-sm text-gray-400">{s.backlogs}</td>
                <td className="py-2.5"><StatusBadge status={s.placement_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-4 text-xs text-gray-600">{students?.length ?? 0} eligible students</p>
    </Modal>
  );
}
