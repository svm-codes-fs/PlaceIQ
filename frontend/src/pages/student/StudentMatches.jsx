import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { api } from "@/utils/api";
import { Alert, errorMessage } from "@/components/ui/Form";
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
    <div className="max-w-6xl mx-auto pt-6 pb-16 space-y-5 animate-in fade-in duration-500">
      <header>
        <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">Placement</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter">
          JOB <span className="text-gradient">MATCHES.</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Upcoming drives ranked by how well they fit your profile: meaning-based similarity between your profile
          and the job, plus how many of its required skills you have.
        </p>
      </header>

      {message && <Alert type={message.type} items={message.items}>{message.text}</Alert>}

      {data && !data.has_profile && (
        <div className="glass-panel flex items-center gap-4 rounded-2xl border border-primary/30 p-5">
          <Sparkles className="h-5 w-5 shrink-0 text-primaryLight" />
          <p className="flex-1 text-sm text-gray-300">Add your skills (or upload your resume) to get meaningful matches.</p>
          <Link to="/student/resume" className="text-xs font-bold text-primaryLight hover:text-white">Set up profile →</Link>
        </div>
      )}

      {!data ? (
        <p className="py-16 text-center text-sm text-gray-600 animate-pulse">Ranking drives...</p>
      ) : data.matches.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">No upcoming drives right now.</p>
      ) : (
        <ol className="space-y-3">
          {data.matches.map((m, i) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-panel rounded-2xl border border-white/5 p-5"
            >
              <div className="flex flex-wrap items-start gap-4">
                <span className="mt-1 w-6 text-sm font-bold text-gray-600">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-white">{m.name}</p>
                  <p className="text-xs text-primaryLight">{m.role_offered} · ₹{m.package_lpa} LPA</p>
                </div>
                <ScoreBar score={m.score} />
                <div className="w-32 flex justify-end">
                  {m.application_status ? (
                    <StatusBadge status={m.application_status} />
                  ) : m.is_eligible ? (
                    <button onClick={() => apply(m)} disabled={applying === m.id}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                      {applying === m.id ? "Applying..." : "Apply"} <ArrowRight className="h-3 w-3" />
                    </button>
                  ) : (
                    <span className="rounded-xl border border-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600">Ineligible</span>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-4 pl-10 md:grid-cols-2">
                {m.matched_skills.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">You have</p>
                    <SkillChips skills={m.matched_skills} tone="matched" />
                  </div>
                )}
                {m.missing_skills.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">Skills to build</p>
                    <SkillChips skills={m.missing_skills} tone="missing" />
                  </div>
                )}
              </div>
              {!m.is_eligible && !m.application_status && (
                <ul className="mt-3 space-y-1 pl-10">
                  {m.ineligibility_reasons.map((r) => (
                    <li key={r} className="flex items-center gap-2 text-[11px] text-gray-500">
                      <AlertCircle className="h-3 w-3 shrink-0 text-danger/70" /> {r}
                    </li>
                  ))}
                </ul>
              )}
            </motion.li>
          ))}
        </ol>
      )}
    </div>
  );
}
