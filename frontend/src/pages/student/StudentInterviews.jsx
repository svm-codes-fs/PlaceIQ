import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessagesSquare, ArrowRight } from "lucide-react";
import { api } from "@/utils/api";
import { Alert, Field, PrimaryButton, Select, errorMessage } from "@/components/ui/Form";
import { ProgressChart } from "@/components/ui/ProgressChart";
import { Card, EmptyState, LoadingRows, Page, PageHeader } from "@/components/ui/Page";

const ROUNDS = [
  { value: "technical", label: "Technical" },
  { value: "hr", label: "HR" },
  { value: "behavioral", label: "Behavioural" },
];
const STATUS_TEXT = { generating: "Preparing questions…", ready: "In progress", scoring: "Scoring…", completed: "Scored", failed: "Failed" };

export function StudentInterviews() {
  const [data, setData] = useState(null);
  const [drives, setDrives] = useState([]);
  const [form, setForm] = useState({ round_type: "technical", company_id: "", count: "5" });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/student/interviews").then(setData);
    api.get("/student/companies").then((cs) => setDrives(cs.filter((c) => c.status !== "Completed")));
  }, []);

  const start = async (e) => {
    e.preventDefault();
    setStarting(true);
    setError(null);
    try {
      const session = await api.post("/student/interviews", {
        round_type: form.round_type, count: Number(form.count),
        company_id: form.company_id ? Number(form.company_id) : null,
      });
      navigate(`/student/interviews/${session.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setStarting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Mock interviews"
        description="Practise with questions written for a specific drive and your own profile, then get scored feedback on every answer."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2" title="Start a session">
          <form onSubmit={start} className="space-y-4">
            {error && <Alert items={error.items}>{error.text}</Alert>}
            <Field label="Round"><Select value={form.round_type} onChange={(e) => setForm({ ...form, round_type: e.target.value })} options={ROUNDS} /></Field>
            <Field label="For a drive (optional)">
              <Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                options={[{ value: "", label: "General practice" }, ...drives.map((d) => ({ value: d.id, label: `${d.name} — ${d.role_offered}` }))]} />
            </Field>
            <Field label="Questions">
              <Select value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} options={["3", "5", "8"]} />
            </Field>
            <PrimaryButton type="submit" disabled={starting} className="w-full py-2.5">
              {starting ? "Preparing…" : "Start interview"}
            </PrimaryButton>
          </form>
        </Card>

        <Card className="lg:col-span-3" title="Your score over time" description="Average of correctness, clarity and depth, out of 10">
          {data ? <ProgressChart points={data.progress} /> : <div className="h-40 animate-pulse rounded-md bg-slate-100" />}
        </Card>
      </div>

      <Card title="History" flush>
        {!data ? (
          <LoadingRows rows={3} />
        ) : data.sessions.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="No interviews yet" description="Start a session above to practise." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Date</th><th>Round</th><th>Drive</th><th>Status</th><th className="text-right">Score</th><th><span className="sr-only">Open</span></th></tr>
              </thead>
              <tbody>
                {data.sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="num whitespace-nowrap text-muted">{new Date(s.created_at + "Z").toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</td>
                    <td className="capitalize">{s.round_type}</td>
                    <td>{s.company ? s.company.name : "General"}</td>
                    <td className="text-muted">{STATUS_TEXT[s.status]}</td>
                    <td className="num text-right font-medium">{s.overall_score != null ? `${s.overall_score}/10` : "—"}</td>
                    <td className="text-right">
                      <Link to={`/student/interviews/${s.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-hover">
                        {s.status === "ready" ? "Continue" : "Open"} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}
