import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessagesSquare, ArrowRight } from "lucide-react";
import { api } from "@/utils/api";
import { Alert, Field, PrimaryButton, Select, errorMessage } from "@/components/ui/Form";
import { ProgressChart } from "@/components/ui/ProgressChart";

const ROUNDS = [
  { value: "technical", label: "Technical" },
  { value: "hr", label: "HR" },
  { value: "behavioral", label: "Behavioural" },
];
const STATUS_TEXT = { generating: "Preparing questions...", ready: "In progress", scoring: "Scoring...", completed: "Scored", failed: "Failed" };

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
    <div className="max-w-6xl mx-auto pt-6 pb-16 space-y-6 animate-in fade-in duration-500">
      <header>
        <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">Preparation</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter">
          MOCK <span className="text-gradient">INTERVIEWS.</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Practise with questions written for a specific drive and your own profile, then get scored feedback on every answer.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={start} className="lg:col-span-2 glass-panel rounded-2xl border border-white/5 p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">Start a session</h2>
          {error && <Alert items={error.items}>{error.text}</Alert>}
          <Field label="Round"><Select value={form.round_type} onChange={(e) => setForm({ ...form, round_type: e.target.value })} options={ROUNDS} /></Field>
          <Field label="For a drive (optional)">
            <Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}
              options={[{ value: "", label: "General practice" }, ...drives.map((d) => ({ value: d.id, label: `${d.name} — ${d.role_offered}` }))]} />
          </Field>
          <Field label="Questions">
            <Select value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} options={["3", "5", "8"]} />
          </Field>
          <PrimaryButton type="submit" disabled={starting} className="w-full py-3">
            {starting ? "Preparing..." : "Start interview"}
          </PrimaryButton>
        </form>

        <section className="lg:col-span-3 glass-panel rounded-2xl border border-white/5 p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">Your score over time</h2>
          <p className="mb-3 text-xs text-gray-500">Average of correctness, clarity and depth, out of 10.</p>
          {data ? <ProgressChart points={data.progress} /> : <div className="h-40 animate-pulse rounded-xl bg-white/5" />}
        </section>
      </div>

      <section className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <h2 className="border-b border-white/5 px-5 py-4 text-sm font-bold uppercase tracking-widest text-white">History</h2>
        {!data ? (
          <p className="py-10 text-center text-sm text-gray-600 animate-pulse">Loading...</p>
        ) : data.sessions.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <MessagesSquare className="mb-2 h-8 w-8 text-gray-700" />
            <p className="text-sm text-gray-500">No interviews yet. Start one above.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                {["Date", "Round", "Drive", "Status", "Score", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.sessions.map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3 text-xs text-gray-400">{new Date(s.created_at + "Z").toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm capitalize text-white">{s.round_type}</td>
                  <td className="px-5 py-3 text-sm text-gray-300">{s.company ? s.company.name : "General"}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{STATUS_TEXT[s.status]}</td>
                  <td className="px-5 py-3 text-sm font-bold text-white">{s.overall_score != null ? `${s.overall_score}/10` : "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/student/interviews/${s.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-primaryLight hover:text-white">
                      {s.status === "ready" ? "Continue" : "Open"} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
