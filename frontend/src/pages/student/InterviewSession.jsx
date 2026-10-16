import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Cpu, Sparkles, Timer } from "lucide-react";
import { api } from "@/utils/api";
import { useNotifications } from "@/utils/notifications";
import { Alert, GhostButton, PrimaryButton, errorMessage } from "@/components/ui/Form";

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

  if (!session) return <p className="py-24 text-center text-sm text-gray-600 animate-pulse">Loading...</p>;

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Link to="/student/interviews" className="mb-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white">
          <ArrowLeft className="h-3 w-3" /> All interviews
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tighter text-white capitalize">
          {session.round_type} round{session.company ? ` · ${session.company.name}` : ""}
        </h1>
        <p className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          {session.generator === "claude"
            ? <><Sparkles className="h-3.5 w-3.5 text-primaryLight" /> Questions written by Claude for your profile</>
            : session.generator && <><Cpu className="h-3.5 w-3.5" /> Questions from the built-in bank</>}
        </p>
      </div>
    </header>
  );

  if (session.status === "generating" || session.status === "scoring") {
    return (
      <div className="max-w-4xl mx-auto pt-6 space-y-6">
        {header}
        <div className="glass-panel rounded-2xl border border-white/5 py-20 text-center">
          <p className="text-sm text-primaryLight animate-pulse">
            {session.status === "generating" ? "Writing your questions..." : "Scoring your answers..."}
          </p>
        </div>
      </div>
    );
  }

  if (session.status === "failed") {
    return (
      <div className="max-w-4xl mx-auto pt-6 space-y-6">{header}<Alert>{session.error || "Something went wrong."}</Alert></div>
    );
  }

  if (session.status === "completed") {
    return (
      <div className="max-w-4xl mx-auto pt-6 pb-16 space-y-6 animate-in fade-in duration-500">
        {header}
        <section className="glass-panel rounded-2xl border border-primary/30 p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Overall</p>
          <p className="mt-1 text-5xl font-light text-white">{session.overall_score}<span className="text-xl text-gray-500"> / 10</span></p>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">{session.overall_feedback}</p>
          <p className="mt-3 flex items-center gap-2 text-[11px] text-gray-600">
            {session.scorer === "claude" ? <><Sparkles className="h-3 w-3" /> Scored by Claude</> : <><Cpu className="h-3 w-3" /> Scored with the offline rubric</>}
          </p>
          {session.error && <p className="mt-2 text-[11px] text-warning">{session.error}</p>}
        </section>
        <ol className="space-y-4">
          {session.questions.map((q, i) => (
            <li key={q.id} className="glass-panel rounded-2xl border border-white/5 p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-bold text-white">{i + 1}. {q.question}</p>
                <span className="shrink-0 text-lg font-bold text-white">{q.score ?? 0}<span className="text-xs text-gray-500">/10</span></span>
              </div>
              <div className="flex flex-wrap gap-4 text-[11px] text-gray-500">
                <span>Correctness <b className="text-white">{q.correctness}</b></span>
                <span>Clarity <b className="text-white">{q.clarity}</b></span>
                <span>Depth <b className="text-white">{q.depth}</b></span>
                {q.time_taken_s ? <span>Time {Math.round(q.time_taken_s / 60 * 10) / 10} min</span> : null}
              </div>
              <blockquote className="rounded-xl bg-white/[0.03] px-4 py-3 text-xs text-gray-400 whitespace-pre-wrap">{q.answer || "(no answer)"}</blockquote>
              <p className="text-sm text-gray-300">{q.feedback}</p>
              {q.ideal_points?.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">A strong answer covers</p>
                  <ul className="list-disc space-y-0.5 pl-5 text-xs text-gray-400">{q.ideal_points.map((p) => <li key={p}>{p}</li>)}</ul>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // Answering
  const total = session.questions.length;
  const over = seconds > SUGGESTED_SECONDS;
  return (
    <div className="max-w-4xl mx-auto pt-6 pb-16 space-y-6">
      {header}
      {error && <Alert items={error.items}>{error.text}</Alert>}
      <div className="flex gap-1.5" aria-label={`Question ${index + 1} of ${total}`}>
        {session.questions.map((q, i) => (
          <button key={q.id} onClick={() => go(i)} aria-label={`Go to question ${i + 1}`}
            className={`h-1.5 flex-1 rounded-full ${i === index ? "bg-primary" : (answers[q.id] || "").trim() ? "bg-primary/40" : "bg-white/10"}`} />
        ))}
      </div>
      <section className="glass-panel rounded-2xl border border-white/5 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Question {index + 1} of {total}{question.focus ? ` · ${question.focus}` : ""}</p>
            <h2 className="mt-2 text-lg font-bold leading-snug text-white">{question.question}</h2>
          </div>
          <span className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums ${over ? "bg-warning/10 text-warning" : "bg-white/5 text-gray-400"}`}
            title={`Aim for about ${SUGGESTED_SECONDS / 60} minutes`}>
            <Timer className="h-3.5 w-3.5" /> {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </span>
        </div>
        <textarea
          rows={10}
          value={answers[question.id] || ""}
          onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
          aria-label="Your answer"
          placeholder="Answer as you would in the interview. Structure helps: situation or concept, your approach, the result, trade-offs."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex items-center justify-between gap-3">
          <GhostButton onClick={() => go(index - 1)} disabled={index === 0}><ArrowLeft className="h-3.5 w-3.5" /> Previous</GhostButton>
          {index < total - 1 ? (
            <PrimaryButton onClick={() => go(index + 1)}>Next <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton>
          ) : (
            <PrimaryButton onClick={submitAll} disabled={submitting}>{submitting ? "Submitting..." : "Submit for scoring"}</PrimaryButton>
          )}
        </div>
      </section>
    </div>
  );
}
