import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Sparkles, Target } from "lucide-react";
import { api } from "@/utils/api";
import { Alert, PrimaryButton, errorMessage } from "@/components/ui/Form";
import { Card, EmptyState, LoadingRows, Page, PageHeader } from "@/components/ui/Page";
import { ScoreBar, SkillChips } from "@/components/ui/SkillInput";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function StudentMatches() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState(null);
  const [applying, setApplying] = useState(null);

  const load = () => api.get("/student/matches").then(setData);
  useEffect(() => { load(); }, []);

  const apply = async (m) => {
    setApplying(m.id);
    setMessage(null);
    try {
      const d = await api.post(`/student/apply/${m.id}`);
      setMessage({ type: "success", text: d.message });
      await load();
    } catch (err) {
      setMessage({ type: "error", ...errorMessage(err) });
    }
    setApplying(null);
  };

  return (
    <Page className="max-w-5xl">
      <PageHeader
        title="Job matches"
        description="Upcoming drives ranked by how well they fit your profile: meaning-based similarity between your profile and the job, plus how many of its required skills you have."
      />

      {message && <Alert type={message.type} items={message.items}>{message.text}</Alert>}

      {data && !data.has_profile && (
        <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-brand-soft px-5 py-4 sm:flex-row sm:items-center">
          <Sparkles className="h-5 w-5 shrink-0 text-brand" />
          <p className="flex-1 text-sm text-ink">Add your skills, or upload your resume, to get meaningful matches.</p>
          <Link to="/student/resume" className="text-sm font-medium text-brand hover:text-brand-hover">Set up profile</Link>
        </div>
      )}

      {!data ? (
        <LoadingRows rows={4} className="p-0" />
      ) : data.matches.length === 0 ? (
        <Card><EmptyState icon={Target} title="No upcoming drives right now" description="Matches appear when your placement cell posts new drives." /></Card>
      ) : (
        <ol className="space-y-3">
          {data.matches.map((m, i) => (
            <li key={m.id} className="rounded-lg border border-line bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-center gap-4">
                <span className="num w-7 text-sm font-semibold text-muted">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-ink">{m.name}</p>
                  <p className="truncate text-sm text-muted">{m.role_offered} · <span className="num">₹{m.package_lpa} LPA</span></p>
                </div>
                <ScoreBar score={m.score} />
                <div className="flex w-28 justify-end">
                  {m.application_status ? (
                    <StatusBadge status={m.application_status} />
                  ) : m.is_eligible ? (
                    <PrimaryButton onClick={() => apply(m)} disabled={applying === m.id}>
                      {applying === m.id ? "Applying…" : "Apply"}
                    </PrimaryButton>
                  ) : (
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-muted">Ineligible</span>
                  )}
                </div>
              </div>

              {(m.matched_skills.length > 0 || m.missing_skills.length > 0) && (
                <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:pl-11 md:grid-cols-2">
                  {m.matched_skills.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted">You have</p>
                      <SkillChips skills={m.matched_skills} tone="matched" />
                    </div>
                  )}
                  {m.missing_skills.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted">Skills to build</p>
                      <SkillChips skills={m.missing_skills} tone="missing" />
                    </div>
                  )}
                </div>
              )}
              {!m.is_eligible && !m.application_status && (
                <ul className="mt-3 space-y-1 rounded-md bg-slate-50 px-3 py-2 sm:ml-11">
                  {m.ineligibility_reasons.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-xs text-muted">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" /> {r}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </Page>
  );
}
