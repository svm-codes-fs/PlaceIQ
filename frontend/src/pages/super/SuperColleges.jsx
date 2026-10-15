import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Plus } from "lucide-react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/Modal";
import { Alert, Field, GhostButton, PrimaryButton, TextInput, errorMessage } from "@/components/ui/Form";

const EMPTY = { name: "", code: "", admin_username: "", admin_email: "", admin_password: "" };

export function SuperColleges() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = () => api.get("/super/colleges").then(setColleges).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const totals = colleges.reduce(
    (t, c) => ({ students: t.students + c.students, placed: t.placed + c.placed, companies: t.companies + c.companies }),
    { students: 0, placed: 0, companies: 0 }
  );

  return (
    <div className="max-w-7xl mx-auto pt-6 pb-12 space-y-5 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">Platform</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter leading-tight">
            COLLEGES <span className="text-gradient">ON PLACEIQ.</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {colleges.length} colleges · {totals.students} students · {totals.placed} placed · {totals.companies} drives
          </p>
        </div>
        <PrimaryButton onClick={() => setAdding(true)}>
          <Plus className="w-3.5 h-3.5" /> Add College
        </PrimaryButton>
      </header>

      {notice && <Alert type="success">{notice}</Alert>}

      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="py-12 text-center text-sm text-gray-600 animate-pulse">Loading colleges...</p>
        ) : colleges.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <Building2 className="w-8 h-8 text-gray-700 mb-2" />
            <p className="text-sm font-bold text-gray-400">No colleges yet</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                {["College", "Students", "Placed", "Placement rate", "Drives", "Joined"].map((h) => (
                  <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-500 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {colleges.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-sm text-white">{c.name}</p>
                    <p className="text-[10px] font-bold tracking-widest text-primaryLight">{c.code}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-white">{c.students}</td>
                  <td className="px-5 py-3.5 text-sm text-success">{c.placed}</td>
                  <td className="px-5 py-3.5 text-sm text-white">
                    {c.students ? `${Math.round((c.placed / c.students) * 1000) / 10}%` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-white">{c.companies}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddCollege
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(college, admin) => {
          setAdding(false);
          setNotice(`Added ${college.name}. Its admin can sign in as ${admin}.`);
          load();
        }}
      />
    </div>
  );
}

function AddCollege({ open, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(EMPTY); setError(null); } }, [open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onSaved(await api.post("/super/colleges", form), form.admin_username);
    } catch (err) {
      setError(errorMessage(err));
    }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add college" subtitle="Creates the college and its first college admin account.">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert items={error.items}>{error.text}</Alert>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="College name" className="sm:col-span-2"><TextInput required value={form.name} onChange={set("name")} /></Field>
          <Field label="Short code"><TextInput required maxLength={20} value={form.code} onChange={set("code")} placeholder="e.g. NITJ" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Admin username"><TextInput required value={form.admin_username} onChange={set("admin_username")} /></Field>
          <Field label="Admin email"><TextInput required type="email" value={form.admin_email} onChange={set("admin_email")} /></Field>
          <Field label="Admin password" hint="At least 8 characters">
            <TextInput required minLength={8} value={form.admin_password} onChange={set("admin_password")} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Adding..." : "Add college"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
