import { useState, useEffect } from "react";
import { Plus, Briefcase, Pencil, Trash2, Users, Sparkles } from "lucide-react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert, Field, GhostButton, IconButton, PrimaryButton, Select, TextInput, Textarea, errorMessage } from "@/components/ui/Form";
import { Card, EmptyState, LoadingRows, Page, PageHeader, SearchInput } from "@/components/ui/Page";
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
    <Page>
      <PageHeader
        title="Companies & drives"
        description={`${companies.length} ${companies.length === 1 ? "recruitment drive" : "recruitment drives"} with their eligibility rules and required skills.`}
        actions={
          <PrimaryButton onClick={() => setEditing({})}>
            <Plus className="h-4 w-4" /> Add drive
          </PrimaryButton>
        }
      />

      {notice && <Alert type={notice.type}>{notice.text}</Alert>}

      <Card flush>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company or role" label="Search drives" />
          <p className="num text-sm text-muted">{filtered.length} shown</p>
        </div>
        {loading ? (
          <LoadingRows rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Briefcase} title="No drives found"
            description={search ? "No drives match your search." : "Add a recruitment drive to start accepting applications."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Company &amp; role</th><th className="text-right">Package</th><th>Eligibility</th>
                  <th className="text-right">Applicants</th><th>Status</th><th>Drive date</th><th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((company) => (
                  <tr key={company.id}>
                    <td className="max-w-[18rem]">
                      <p className="truncate font-medium text-ink" title={company.name}>{company.name}</p>
                      <p className="truncate text-xs text-muted" title={company.role_offered}>{company.role_offered}</p>
                    </td>
                    <td className="num whitespace-nowrap text-right font-medium">₹{company.package_lpa} LPA</td>
                    <td className="text-muted">
                      <p className="num whitespace-nowrap">CGPA ≥ {company.min_cgpa} · backlogs ≤ {company.max_backlogs}</p>
                      <p className="text-xs">{company.allowed_branches.join(", ")}</p>
                    </td>
                    <td className="num text-right">{company.applicant_count}</td>
                    <td><StatusBadge status={company.status} /></td>
                    <td className="num whitespace-nowrap text-muted">
                      {company.visit_date ? new Date(company.visit_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "To be announced"}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <IconButton onClick={() => setCandidatesFor(company)} aria-label={`Top candidates for ${company.name}`} title="Top candidates">
                          <Sparkles className="h-4 w-4" />
                        </IconButton>
                        <IconButton onClick={() => setEligibleFor(company)} aria-label={`Eligible students for ${company.name}`} title="Eligible students">
                          <Users className="h-4 w-4" />
                        </IconButton>
                        <IconButton onClick={() => setEditing(company)} aria-label={`Edit ${company.name}`} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton danger onClick={() => remove(company)} aria-label={`Delete ${company.name}`} title="Delete">
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
      </Card>

      <CompanyForm
        company={editing}
        onClose={() => setEditing(null)}
        onSaved={(text) => { setEditing(null); setNotice({ type: "success", text }); load(); }}
      />
      <EligibleStudents company={eligibleFor} onClose={() => setEligibleFor(null)} />
      <CompanyCandidates company={candidatesFor} onClose={() => setCandidatesFor(null)} />
    </Page>
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
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">Allowed branches</legend>
          <div className="flex flex-wrap gap-2">
            {BRANCHES.map((b) => {
              const on = form.allowed_branches.includes(b);
              return (
                <button key={b} type="button" aria-pressed={on} onClick={() => toggleBranch(b)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors
                    ${on ? "border-brand bg-brand-soft text-brand" : "border-line bg-white text-muted hover:bg-slate-50 hover:text-ink"}`}>
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
          <Textarea rows={3} value={form.description} onChange={set("description")} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving…" : isNew ? "Add drive" : "Save changes"}</PrimaryButton>
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
        <LoadingRows rows={3} className="p-0" />
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="No eligible students" description="No students currently meet these criteria." />
      ) : (
        <div className="-mx-5 overflow-x-auto border-y border-line">
          <table className="table-base">
            <thead>
              <tr><th>Student</th><th>Roll number</th><th>Branch</th><th className="text-right">CGPA</th><th className="text-right">Backlogs</th><th>Status</th></tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.name}</td>
                  <td className="num text-muted">{s.roll_no}</td>
                  <td className="text-muted">{s.branch}</td>
                  <td className="num text-right">{s.cgpa.toFixed(2)}</td>
                  <td className="num text-right text-muted">{s.backlogs}</td>
                  <td><StatusBadge status={s.placement_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {students && students.length > 0 && <p className="num mt-4 text-sm text-muted">{students.length} eligible students</p>}
    </Modal>
  );
}
