import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Pencil, Trash2, CheckCircle2, Users } from "lucide-react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/Modal";
import { Alert, Field, GhostButton, PrimaryButton, Select, TextInput, errorMessage } from "@/components/ui/Form";

const BRANCHES = ["CSE", "ECE", "ME", "CE", "EE", "CHE"];
const EMPTY = { username: "", email: "", password: "", name: "", roll_no: "", phone: "", branch: "CSE", cgpa: "", backlogs: "0" };

export function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // null = closed, {} = new, student = edit
  const [notice, setNotice] = useState(null);

  const load = () => api.get("/admin/students").then(setStudents).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const remove = async (student) => {
    if (!window.confirm(`Delete ${student.name} (${student.roll_no})? Their login and applications are removed too.`)) return;
    try {
      const data = await api.del(`/admin/students/${student.id}`);
      setNotice({ type: "success", text: data.message });
      load();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  const q = search.toLowerCase();
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(q) || s.roll_no.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q)
  );

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-5 animate-in fade-in duration-500">

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
              aria-label="Search students"
              className="pl-9 pr-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <PrimaryButton onClick={() => setEditing({})}>
            <Plus className="w-3.5 h-3.5" /> Add Student
          </PrimaryButton>
        </div>
      </header>

      {notice && <Alert type={notice.type}>{notice.text}</Alert>}

      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                {["Student", "Branch", "CGPA", "Backlogs", "Status", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">{h}</th>
                ))}
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
                      <p className="text-xs text-gray-600 mt-1">{search ? "Try adjusting your search query." : "Add a student or share the registration page."}</p>
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
                        <div className="w-8 h-8 rounded-xl bg-white/5 text-white flex items-center justify-center font-bold text-xs group-hover:bg-primary transition-all border border-white/5 shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-white">{student.name}</p>
                          <p className="text-[10px] text-gray-600 tracking-widest">{student.roll_no} · {student.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2.5 py-1 bg-white/5 text-gray-400 border border-white/5 rounded-lg text-[10px] font-bold tracking-widest uppercase">
                        {student.branch}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-white">{student.cgpa.toFixed(2)}</td>
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
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditing(student)} aria-label={`Edit ${student.name}`}
                          className="p-1.5 text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => remove(student)} aria-label={`Delete ${student.name}`}
                          className="p-1.5 text-gray-600 hover:text-danger transition-colors rounded-lg hover:bg-danger/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StudentForm
        student={editing}
        onClose={() => setEditing(null)}
        onSaved={(text) => { setEditing(null); setNotice({ type: "success", text }); load(); }}
      />
    </div>
  );
}

function StudentForm({ student, onClose, onSaved }) {
  const isNew = student && !student.id;
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setError(null);
    if (student) setForm(isNew ? EMPTY : { ...EMPTY, ...student, cgpa: String(student.cgpa), backlogs: String(student.backlogs) });
  }, [student, isNew]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await api.post("/admin/students", form);
        onSaved(`Added ${form.name}. They can sign in as ${form.username}.`);
      } else {
        const { name, roll_no, phone, branch, cgpa, backlogs } = form;
        await api.put(`/admin/students/${student.id}`, { name, roll_no, phone, branch, cgpa, backlogs });
        onSaved(`Updated ${form.name}.`);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
    setSaving(false);
  };

  return (
    <Modal open={!!student} onClose={onClose} title={isNew ? "Add student" : "Edit student"}
      subtitle={isNew ? "Creates a login for the student in your college." : student?.email}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert items={error.items}>{error.text}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><TextInput required value={form.name} onChange={set("name")} /></Field>
          <Field label="Roll number"><TextInput required value={form.roll_no} onChange={set("roll_no")} /></Field>
          {isNew && (
            <>
              <Field label="Username"><TextInput required value={form.username} onChange={set("username")} /></Field>
              <Field label="Email"><TextInput required type="email" value={form.email} onChange={set("email")} /></Field>
              <Field label="Initial password" hint="At least 8 characters; share it with the student">
                <TextInput required type="text" minLength={8} value={form.password} onChange={set("password")} />
              </Field>
            </>
          )}
          <Field label="Phone"><TextInput value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Branch"><Select value={form.branch} onChange={set("branch")} options={BRANCHES} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CGPA"><TextInput required type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={set("cgpa")} /></Field>
            <Field label="Backlogs"><TextInput required type="number" min="0" value={form.backlogs} onChange={set("backlogs")} /></Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving..." : isNew ? "Add student" : "Save changes"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
