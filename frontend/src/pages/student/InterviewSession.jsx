import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Cpu, Loader2, Sparkles, Timer } from "lucide-react";
import { api } from "@/utils/api";
import { useNotifications } from "@/utils/notifications";
import { Alert, GhostButton, PrimaryButton, Textarea, errorMessage } from "@/components/ui/Form";
import { Card, LoadingRows, Page, PageHeader } from "@/components/ui/Page";

const SUGGESTED_SECONDS = 180;

export function InterviewSession() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [elapsed, setElapsed] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { subscribe } = useNotifications();
  const startedAt = useRef(Date.now());

  const load = useCallback(() => api.get(`/student/interviews/${id}`).then((s) => {
    setSession(s);
    if (s.questions) {
      setAnswers(Object.fromEntries(s.questions.map((q) => [q.id, q.answer])));
      setElapsed(Object.fromEntries(s.questions.map((q) => [q.id, q.time_taken_s || 0])));
    }
  }), [id]);

  useEffect(() => { load(); }, [load]);

  // Generation and scoring run in the background: react to the worker's push, poll as a fallback
  const waiting = session && ["generating", "scoring"].includes(session.status);
  useEffect(() => {
    if (!waiting) return undefined;
    const unsubscribe = subscribe((event, data) => { if (event === "interview_updated" && data.id === Number(id)) load(); });
    const timer = setInterval(load, 2500);
    return () => { unsubscribe(); clearInterval(timer); };
  }, [waiting, id, load, subscribe]);

  // Per-question timer
  const question = session?.questions?.[index];
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (session?.status !== "ready") return undefined;
    startedAt.current = Date.now();
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [index, session?.status]);
  const seconds = question ? (elapsed[question.id] || 0) + Math.floor((Date.now() - startedAt.current) / 1000) : 0;
  void tick;

  const saveCurrent = async () => {
    if (!question) return;
    const time = seconds;
    setElapsed((e) => ({ ...e, [question.id]: time }));
    await api.put(`/student/interviews/${id}/answers/${question.id}`, { answer: answers[question.id] || "", time_taken_s: time });
  };

  const go = async (next) => {
    try { await saveCurrent(); } catch (err) { setError(errorMessage(err)); return; }
    setIndex(next);
  };

  const submitAll = async () => {
    if (!window.confirm("Submit your answers for scoring? You can't change them afterwards.")) return;
    setSubmitting(true);
    setError(null);
    try {
      await saveCurrent();
      setSession(await api.post(`/student/interviews/${id}/submit`));
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
    setSubmitting(false);
  };

  if (!session) return <Page className="max-w-4xl"><LoadingRows rows={4} className="p-0" /></Page>;

  const header = (
    <div>
      <Link to="/student/interviews" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All interviews
      </Link>
      <PageHeader
        title={<span className="capitalize">{session.round_type} round{session.company ? ` · ${session.company.name}` : ""}</span>}
        description={session.generator === "claude"
          ? <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-brand" /> Questions written by Claude for your profile</span>
          : session.generator && <span className="inline-flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" /> Questions from the built-in bank</span>}
      />
    </div>
  );

  if (session.status === "generating" || session.status === "scoring") {
    return (
      <Page className="max-w-4xl">
        {header}
        <Card>
          <div className="flex flex-col items-center py-12 text-center" role="status">
            <Loader2 className="mb-3 h-6 w-6 animate-spin text-brand" />
            <p className="text-sm font-medium text-ink">{session.status === "generating" ? "Writing your questions…" : "Scoring your answers…"}</p>
            <p className="mt-1 text-sm text-muted">This page updates on its own.</p>
          </div>
        </Card>
      </Page>
    );
  }

  if (session.status === "failed") {
    return (
      <Page className="max-w-4xl">{header}<Alert>{session.error || "Something went wrong."}</Alert></Page>
    );
  }

  if (session.status === "completed") {
    return (
      <Page className="max-w-4xl">
        {header}
        <section className="rounded-lg border border-line bg-white p-6 shadow-card">
          <p className="text-sm font-medium text-muted">Overall</p>
          <p className="num mt-1 text-4xl font-semibold tracking-tight text-ink">{session.overall_score}<span className="text-lg font-normal text-muted"> / 10</span></p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink">{session.overall_feedback}</p>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            {session.scorer === "claude" ? <><Sparkles className="h-3.5 w-3.5" /> Scored by Claude</> : <><Cpu className="h-3.5 w-3.5" /> Scored with the offline rubric</>}
          </p>
          {session.error && <p className="mt-2 text-xs text-warning">{session.error}</p>}
        </section>
        <ol className="space-y-4">
          {session.questions.map((q, i) => (
            <li key={q.id} className="space-y-3 rounded-lg border border-line bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-semibold text-ink">{i + 1}. {q.question}</p>
                <span className="num shrink-0 text-lg font-semibold text-ink">{q.score ?? 0}<span className="text-xs font-normal text-muted">/10</span></span>
              </div>
              <div className="num flex flex-wrap gap-4 text-xs text-muted">
                <span>Correctness <span className="font-medium text-ink">{q.correctness}</span></span>
                <span>Clarity <span className="font-medium text-ink">{q.clarity}</span></span>
                <span>Depth <span className="font-medium text-ink">{q.depth}</span></span>
                {q.time_taken_s ? <span>Time {Math.round(q.time_taken_s / 60 * 10) / 10} min</span> : null}
              </div>
              <blockquote className="whitespace-pre-wrap rounded-md border-l-2 border-line bg-slate-50 px-4 py-3 text-sm text-muted">{q.answer || "(no answer)"}</blockquote>
              <p className="text-sm text-ink">{q.feedback}</p>
              {q.ideal_points?.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted">A strong answer covers</p>
                  <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">{q.ideal_points.map((p) => <li key={p}>{p}</li>)}</ul>
                </div>
              )}
            </li>
          ))}
        </ol>
      </Page>
    );
  }

  // Answering
  const total = session.questions.length;
  const over = seconds > SUGGESTED_SECONDS;
  return (
    <Page className="max-w-4xl">
      {header}
      {error && <Alert items={error.items}>{error.text}</Alert>}
      <div className="flex gap-1.5" aria-label={`Question ${index + 1} of ${total}`}>
        {session.questions.map((q, i) => (
          <button key={q.id} onClick={() => go(i)} aria-label={`Go to question ${i + 1}`} aria-current={i === index ? "step" : undefined}
            className={`h-1.5 flex-1 rounded-full ${i === index ? "bg-brand" : (answers[q.id] || "").trim() ? "bg-blue-300" : "bg-slate-200"}`} />
        ))}
      </div>
      <section className="space-y-4 rounded-lg border border-line bg-white p-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted">Question {index + 1} of {total}{question.focus ? ` · ${question.focus}` : ""}</p>
            <h2 className="mt-2 text-base font-semibold leading-snug text-ink sm:text-lg">{question.question}</h2>
          </div>
          <span className={`num flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${over ? "bg-warning-soft text-warning" : "bg-slate-100 text-muted"}`}
            title={`Aim for about ${SUGGESTED_SECONDS / 60} minutes`}>
            <Timer className="h-3.5 w-3.5" /> {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </span>
        </div>
        <Textarea
          rows={10}
          value={answers[question.id] || ""}
          onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
          aria-label="Your answer"
          placeholder="Answer as you would in the interview. Structure helps: situation or concept, your approach, the result, trade-offs."
        />
        <div className="flex items-center justify-between gap-3">
          <GhostButton onClick={() => go(index - 1)} disabled={index === 0}><ArrowLeft className="h-4 w-4" /> Previous</GhostButton>
          {index < total - 1 ? (
            <PrimaryButton onClick={() => go(index + 1)}>Next <ArrowRight className="h-4 w-4" /></PrimaryButton>
          ) : (
            <PrimaryButton onClick={submitAll} disabled={submitting}>{submitting ? "Submitting…" : "Submit for scoring"}</PrimaryButton>
          )}
        </div>
      </section>
    </Page>
  );
}
