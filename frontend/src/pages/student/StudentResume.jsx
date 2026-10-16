import { useEffect, useState } from "react";
import { FileUp, Sparkles, Cpu, CheckCircle2 } from "lucide-react";
import { api } from "@/utils/api";
import { useNotifications } from "@/utils/notifications";
import { Alert, Field, PrimaryButton, errorMessage } from "@/components/ui/Form";
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

  if (loading) return <p className="py-24 text-center text-sm text-gray-600 animate-pulse">Loading...</p>;

  const parsed = resume?.status === "parsed" ? resume.parsed : null;

  return (
    <div className="max-w-6xl mx-auto pt-6 pb-16 space-y-6 animate-in fade-in duration-500">
      <header>
        <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">Profile</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter">
          RESUME <span className="text-gradient">& SKILLS.</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Upload your resume and we'll pull out your skills and projects. You review them before they're used to match you with drives.
        </p>
      </header>

      {message && <Alert type={message.type} items={message.items}>{message.text}</Alert>}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Upload and extraction */}
        <section className="lg:col-span-2 space-y-4">
          <label className={`glass-panel flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center hover:border-primary/50 ${uploading ? "opacity-50" : ""}`}>
            <FileUp className="h-8 w-8 text-primaryLight" />
            <span className="text-sm font-bold text-white">{resume ? "Upload a new version" : "Upload your resume"}</span>
            <span className="text-xs text-gray-500">PDF, up to 5 MB</span>
            <input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={uploading}
              onChange={(e) => upload(e.target.files[0])} />
          </label>

          {resume && (
            <div className="glass-panel rounded-2xl border border-white/5 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-white">{resume.filename}</p>
                {parsing && <span className="text-xs text-primaryLight animate-pulse">Reading...</span>}
                {resume.status === "failed" && <span className="text-xs text-danger">Failed</span>}
              </div>
              {resume.status === "failed" && <p className="text-xs text-gray-500">{resume.error}</p>}
              {parsed && (
                <>
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                    {resume.parser === "claude"
                      ? <><Sparkles className="h-3.5 w-3.5 text-primaryLight" /> Read by Claude</>
                      : <><Cpu className="h-3.5 w-3.5" /> Read by the offline parser</>}
                  </p>
                  {resume.error && <p className="text-[11px] text-warning">{resume.error}</p>}
                  {parsed.cgpa != null && <p className="text-xs text-gray-400">CGPA on resume: <b className="text-white">{parsed.cgpa}</b></p>}
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-600">Skills found</p>
                    <SkillChips skills={parsed.skills} />
                  </div>
                  {parsed.projects?.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-600">Projects</p>
                      <ul className="space-y-2">
                        {parsed.projects.map((p) => (
                          <li key={p.name} className="text-xs text-gray-400"><b className="text-white">{p.name}</b> — {p.summary}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button onClick={useSuggestions} className="text-xs font-bold text-primaryLight hover:text-white">
                    Use these in my profile →
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        {/* Reviewed profile */}
        <section className="lg:col-span-3 glass-panel rounded-2xl border border-white/5 p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Your matching profile</h2>
            <p className="mt-1 text-xs text-gray-500">This is what recruiters' drives are matched against. Keep it accurate.</p>
          </div>
          <Field label="Skills">
            <SkillInput value={skills} onChange={setSkills} />
          </Field>
          <Field label="Summary, projects and experience">
            <textarea rows={8} value={summary} onChange={(e) => setSummary(e.target.value)}
              placeholder="What have you built? Internships, projects, achievements..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </Field>
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs text-gray-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saving updates your job matches immediately.
            </p>
            <PrimaryButton onClick={save} disabled={saving}>{saving ? "Saving..." : "Save profile"}</PrimaryButton>
          </div>
        </section>
      </div>
    </div>
  );
}
