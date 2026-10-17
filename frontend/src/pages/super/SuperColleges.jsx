import { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/Modal";
import { Alert, Field, GhostButton, PrimaryButton, TextInput, errorMessage } from "@/components/ui/Form";
import { Card, EmptyState, LoadingRows, Page, PageHeader } from "@/components/ui/Page";

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
    <Page>
      <PageHeader
        title="Colleges"
        description={`${colleges.length} colleges · ${totals.students} students · ${totals.placed} placed · ${totals.companies} drives`}
        actions={<PrimaryButton onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add college</PrimaryButton>}
      />
      {notice && <Alert type="success">{notice}</Alert>}
      <Card flush>
        {loading ? <LoadingRows rows={3} /> : colleges.length === 0 ? (
          <EmptyState icon={Building2} title="No colleges yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>College</th><th className="text-right">Students</th><th className="text-right">Placed</th><th className="text-right">Placement rate</th><th className="text-right">Drives</th><th>Joined</th></tr></thead>
              <tbody>
                {colleges.map((c) => (
                  <tr key={c.id}>
                    <td><p className="font-medium">{c.name}</p><p className="text-xs text-muted">{c.code}</p></td>
                    <td className="num text-right">{c.students}</td>
                    <td className="num text-right">{c.placed}</td>
                    <td className="num text-right">{c.students ? `${Math.round((c.placed / c.students) * 1000) / 10}%` : "—"}</td>
                    <td className="num text-right">{c.companies}</td>
                    <td className="num text-muted">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <AddCollege open={adding} onClose={() => setAdding(false)}
        onSaved={(college, admin) => { setAdding(false); setNotice(`Added ${college.name}. Its admin can sign in as ${admin}.`); load(); }} />
    </Page>
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
