import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Users, FileUp } from "lucide-react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/Modal";
import { ImportStudents } from "./ImportStudents";
import { Pagination, useDebounced } from "@/components/ui/Pagination";
import { Alert, Field, GhostButton, IconButton, PrimaryButton, Select, TextInput, errorMessage } from "@/components/ui/Form";
import { Avatar, Card, EmptyState, LoadingRows, Page, PageHeader, SearchInput } from "@/components/ui/Page";
import { StatusBadge } from "@/components/ui/StatusBadge";

const PER_PAGE = 25;

const BRANCHES = ["CSE", "ECE", "ME", "CE", "EE", "CHE"];
const EMPTY = { username: "", email: "", password: "", name: "", roll_no: "", phone: "", branch: "CSE", cgpa: "", backlogs: "0" };

export function AdminStudents() {
  const [data, setData] = useState({ items: [], total: 0, all_students: 0, placed: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // null = closed, {} = new, student = edit
  const [notice, setNotice] = useState(null);
  const [importing, setImporting] = useState(false);

  const query = useDebounced(search);
  const load = useCallback(() => api.get(`/admin/students?page=${page}&per_page=${PER_PAGE}&q=${encodeURIComponent(query)}`)
    .then(setData).finally(() => setLoading(false)), [page, query]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [query]);

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

  const filteredStudents = data.items;

  return (
    <Page>
      <PageHeader
        title="Students"
        description={`${data.all_students.toLocaleString()} registered · ${data.placed.toLocaleString()} placed`}
        actions={
          <>
            <GhostButton onClick={() => setImporting(true)}>
              <FileUp className="h-4 w-4" /> Import CSV
            </GhostButton>
            <PrimaryButton onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> Add student
            </PrimaryButton>
          </>
        }
      />

      {notice && <Alert type={notice.type}>{notice.text}</Alert>}

      <Card flush>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, roll number or branch" label="Search students" inputClassName="sm:w-80" />
          <p className="num text-sm text-muted">{data.total.toLocaleString()} {data.total === 1 ? "result" : "results"}</p>
        </div>
        {loading ? (
          <LoadingRows rows={6} />
        ) : filteredStudents.length === 0 ? (
          <EmptyState icon={Users} title="No students found"
            description={search ? "Try a different name, roll number or branch." : "Add students one by one, import a CSV, or share the registration page."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Student</th><th>Roll number</th><th>Branch</th><th className="text-right">CGPA</th>
                  <th className="text-right">Backlogs</th><th>Status</th><th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="max-w-[16rem]">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink" title={student.name}>{student.name}</p>
                          <p className="truncate text-xs text-muted" title={student.email}>{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="num whitespace-nowrap text-muted">{student.roll_no}</td>
                    <td><span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">{student.branch}</span></td>
                    <td className="num text-right font-medium">{student.cgpa.toFixed(2)}</td>
                    <td className={`num text-right ${student.backlogs > 0 ? "font-medium text-danger" : "text-muted"}`}>{student.backlogs}</td>
                    <td><StatusBadge status={student.placement_status} /></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <IconButton onClick={() => setEditing(student)} aria-label={`Edit ${student.name}`} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton danger onClick={() => remove(student)} aria-label={`Delete ${student.name}`} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} perPage={PER_PAGE} total={data.total} onPage={setPage} />
      </Card>

      <ImportStudents
        open={importing}
        onClose={() => setImporting(false)}
        onImported={(job) => { setNotice({ type: "success", text: `Imported ${job.created_count} students from ${job.filename}.` }); load(); }}
      />

      <StudentForm
        student={editing}
        onClose={() => setEditing(null)}
        onSaved={(text) => { setEditing(null); setNotice({ type: "success", text }); load(); }}
      />
    </Page>
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
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving…" : isNew ? "Add student" : "Save changes"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
