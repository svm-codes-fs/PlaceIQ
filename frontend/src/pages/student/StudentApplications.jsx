import { useState, useEffect } from "react";
import { Check, CheckCircle2, Clock, History } from "lucide-react";
import { api } from "@/utils/api";
import { Alert, GhostButton, PrimaryButton, errorMessage } from "@/components/ui/Form";
import { Timeline } from "@/components/ui/Timeline";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar, Card, EmptyState, LoadingRows, Page, PageHeader } from "@/components/ui/Page";
import { cn } from "@/utils/cn";

const PIPELINE_STAGES = ['Applied', 'Shortlisted', 'Interview', 'Offered'];

export function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [message, setMessage] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);

  const load = () => api.get("/student/applications").then(setApplications).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const respond = async (app, status) => {
    if (status === "Accepted" && !window.confirm(`Accept the offer from ${app.company_name}? This marks you as placed.`)) return;
    setResponding(app.id);
    setMessage(null);
    try {
      const data = await api.post(`/student/applications/${app.id}/respond`, { status });
      setMessage({ type: "success", text: data.message });
      await load();
    } catch (err) {
      setMessage({ type: "error", ...errorMessage(err) });
    }
    setResponding(null);
  };

  const getStageIndex = (status) => PIPELINE_STAGES.indexOf(status);

  return (
    <Page className="max-w-5xl">
      <PageHeader title="Applications" description="Every drive you have applied to and where each one stands." />

      {message && <Alert type={message.type} items={message.items}>{message.text}</Alert>}

      {loading ? (
        <LoadingRows rows={3} className="p-0" />
      ) : applications.length === 0 ? (
        <Card>
          <EmptyState icon={Clock} title="No applications yet" description="Apply to an eligible drive and you can track it here." />
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const stageIdx = getStageIndex(app.status);
            const isRejected = app.status === "Rejected";
            const isDeclined = app.status === "Declined" || app.status === "Expired";
            const isOffered = app.status === "Offered";
            const isAccepted = app.status === "Accepted";

            return (
              <section key={app.id} className={cn("rounded-lg border bg-white shadow-card", isOffered ? "border-blue-200" : "border-line")}>
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <Avatar name={app.company_name} className="h-10 w-10 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold text-ink">{app.company_name}</h2>
                    <p className="truncate text-sm text-muted">{app.role_offered}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Package</p>
                    <p className="num text-sm font-semibold text-ink">₹{app.package_lpa} LPA</p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                <div className="border-t border-line px-5 py-4">
                  {isRejected ? (
                    <p className="text-sm text-muted">The company did not take this application forward.</p>
                  ) : isDeclined ? (
                    <p className="text-sm text-muted">{app.status === "Expired" ? "This offer expired before you responded." : "You declined this offer."}</p>
                  ) : isAccepted ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-success">
                      <CheckCircle2 className="h-4 w-4 shrink-0" /> Offer accepted. You are marked as placed.
                    </p>
                  ) : isOffered ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <p className="flex-1 text-sm text-ink">
                        <span className="font-medium">{app.company_name} has made you an offer.</span>{" "}
                        <span className="text-muted">Accepting marks you as placed.</span>
                      </p>
                      <div className="flex gap-2">
                        <GhostButton onClick={() => respond(app, "Declined")} disabled={responding === app.id}>Decline</GhostButton>
                        <PrimaryButton onClick={() => respond(app, "Accepted")} disabled={responding === app.id}>Accept offer</PrimaryButton>
                      </div>
                    </div>
                  ) : (
                    <ol className="flex items-center" aria-label="Application progress">
                      {PIPELINE_STAGES.map((stage, idx) => {
                        const isDone = idx < stageIdx;
                        const isActive = idx === stageIdx;
                        return (
                          <li key={stage} className="flex flex-1 items-center last:flex-none" aria-current={isActive ? "step" : undefined}>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-2xs font-semibold",
                                isDone ? "border-brand bg-brand text-white" : isActive ? "border-brand bg-brand-soft text-brand" : "border-line bg-white text-slate-400"
                              )}>
                                {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                              </span>
                              <span className={cn("hidden whitespace-nowrap text-xs font-medium sm:inline", isDone || isActive ? "text-ink" : "text-slate-400")}>{stage}</span>
                            </div>
                            {idx < PIPELINE_STAGES.length - 1 && (
                              <span className={cn("mx-3 h-px flex-1", isDone ? "bg-brand" : "bg-line")} />
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>

                <div className="border-t border-line px-5 py-3">
                  <button
                    onClick={() => setHistoryFor(historyFor === app.id ? null : app.id)}
                    aria-expanded={historyFor === app.id}
                    className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
                  >
                    <History className="h-4 w-4" /> {historyFor === app.id ? "Hide history" : "View history"}
                  </button>
                  {historyFor === app.id && (
                    <div className="mt-4"><Timeline url={`/student/applications/${app.id}/timeline`} /></div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Page>
  );
}
