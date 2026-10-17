import { useEffect, useState } from "react";
import { FileText, FileUp, Sparkles, Cpu } from "lucide-react";
import { api } from "@/utils/api";
import { useNotifications } from "@/utils/notifications";
import { Alert, Field, GhostButton, PrimaryButton, Textarea, errorMessage } from "@/components/ui/Form";
import { Card, LoadingRows, Page, PageHeader } from "@/components/ui/Page";
import { cn } from "@/utils/cn";
import { SkillInput, SkillChips } from "@/components/ui/SkillInput";

export function StudentResume() {
  const [resume, setResume] = useState(null);
  const [skills, setSkills] = useState([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const { subscribe } = useNotifications();

  const load = () => api.get("/student/resume").then((d) => {
    setResume(d.resume);
    setSkills(d.profile.skills);
    setSummary(d.profile.profile_summary);
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // Parsing runs in the background: listen for the worker's push, poll as a fallback
  const parsing = resume && ["uploaded", "parsing"].includes(resume.status);
  useEffect(() => {
    if (!parsing) return undefined;
    const unsubscribe = subscribe((event, data) => { if (event === "resume_parsed") setResume(data); });
    const timer = setInterval(() => api.get("/student/resume").then((d) => setResume(d.resume)), 2000);
    return () => { unsubscribe(); clearInterval(timer); };
  }, [parsing, subscribe]);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const d = await api.upload("/student/resume", file);
      setResume(d.resume);
    } catch (err) {
      setMessage({ type: "error", ...errorMessage(err) });
    }
    setUploading(false);
  };

  const useSuggestions = async () => {
    const d = await api.get("/student/resume/suggested-profile");
    setSkills(d.skills);
    setSummary(d.profile_summary);
    setMessage({ type: "success", text: "Filled in from your resume. Review it, then save." });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const d = await api.put("/student/skills", { skills, profile_summary: summary });
      setSkills(d.profile.skills);
      setMessage({ type: "success", text: d.message });
    } catch (err) {
      setMessage({ type: "error", ...errorMessage(err) });
    }
    setSaving(false);
  };

  if (loading) return <Page><LoadingRows rows={4} className="p-0" /></Page>;

  const parsed = resume?.status === "parsed" ? resume.parsed : null;

  return (
    <Page>
      <PageHeader
        title="Resume & skills"
        description="Upload your resume and we pull out your skills and projects. You review them before they are used to match you with drives."
      />

      {message && <Alert type={message.type} items={message.items}>{message.text}</Alert>}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Upload and extraction */}
        <div className="space-y-4 lg:col-span-2">
          <label className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center transition-colors hover:border-brand hover:bg-brand-soft/40 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20",
            uploading && "pointer-events-none opacity-50"
          )}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand"><FileUp className="h-5 w-5" /></span>
            <span className="text-sm font-medium text-ink">{uploading ? "Uploading…" : resume ? "Upload a new version" : "Upload your resume"}</span>
            <span className="text-xs text-muted">PDF, up to 5 MB</span>
            <input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={uploading}
              onChange={(e) => upload(e.target.files[0])} />
          </label>

          {resume && (
            <Card>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
                    <FileText className="h-4 w-4 shrink-0 text-muted" /><span className="truncate">{resume.filename}</span>
                  </p>
                  {parsing && <span className="shrink-0 rounded bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">Reading…</span>}
                  {resume.status === "failed" && <span className="shrink-0 rounded bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">Failed</span>}
                </div>
                {resume.status === "failed" && <p className="text-sm text-muted">{resume.error}</p>}
                {parsed && (
                  <>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      {resume.parser === "claude"
                        ? <><Sparkles className="h-3.5 w-3.5 text-brand" /> Read by Claude</>
                        : <><Cpu className="h-3.5 w-3.5" /> Read by the offline parser</>}
                    </p>
                    {resume.error && <p className="text-xs text-warning">{resume.error}</p>}
                    {parsed.cgpa != null && <p className="text-sm text-muted">CGPA on resume: <span className="num font-medium text-ink">{parsed.cgpa}</span></p>}
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted">Skills found</p>
                      <SkillChips skills={parsed.skills} />
                    </div>
                    {parsed.projects?.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted">Projects</p>
                        <ul className="space-y-2">
                          {parsed.projects.map((p) => (
                            <li key={p.name} className="text-sm text-muted"><span className="font-medium text-ink">{p.name}</span> — {p.summary}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <GhostButton onClick={useSuggestions} className="w-full">Use these in my profile</GhostButton>
                  </>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Reviewed profile */}
        <Card className="lg:col-span-3" title="Your matching profile" description="Drives are matched against this. Keep it accurate.">
          <div className="space-y-5">
            <Field label="Skills">
              <SkillInput value={skills} onChange={setSkills} />
            </Field>
            <Field label="Summary, projects and experience">
              <Textarea rows={8} value={summary} onChange={(e) => setSummary(e.target.value)}
                placeholder="What have you built? Internships, projects, achievements…" />
            </Field>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">Saving updates your job matches immediately.</p>
              <PrimaryButton onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</PrimaryButton>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
