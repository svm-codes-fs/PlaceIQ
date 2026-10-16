import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Circle, History } from "lucide-react";
import { api } from "@/utils/api";
import { Alert, errorMessage } from "@/components/ui/Form";
import { Timeline } from "@/components/ui/Timeline";

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
    <div className="max-w-6xl mx-auto space-y-16 animate-in fade-in duration-700 pb-20 pt-8">

      <header className="border-b border-white/10 pb-8">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tighter leading-[1.1] mb-4">
          MY APPLICATIONS.
        </h1>
        <p className="text-lg text-gray-400 font-light max-w-lg leading-relaxed">
          Track every step of your placement journey in real-time.
        </p>
      </header>

      <div className="space-y-6">
        {message && <Alert type={message.type} items={message.items}>{message.text}</Alert>}
        {loading ? (
          [1, 2].map(i => <div key={i} className="h-48 bg-white/5 rounded-3xl animate-pulse" />)
        ) : applications.length === 0 ? (
          <div className="py-24 text-center glass-panel rounded-3xl border border-white/5">
            <Clock className="w-10 h-10 text-gray-600 mx-auto mb-4" />
            <h3 className="font-bold text-xl text-white mb-2">No Applications Yet</h3>
            <p className="text-gray-500">Apply to companies to start tracking your journey here.</p>
          </div>
        ) : (
          applications.map((app, i) => {
            const stageIdx = getStageIndex(app.status);
            const isRejected = app.status === 'Rejected';
            const isDeclined = app.status === 'Declined' || app.status === 'Expired';
            const isOffered = app.status === 'Offered';
            const isAccepted = app.status === 'Accepted';

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`glass-panel border rounded-3xl p-8 transition-all duration-500
                  ${(isOffered || isAccepted) ? 'border-success/30 shadow-[0_0_40px_-15px_rgba(16,185,129,0.25)]' :
                    isRejected ? 'border-danger/20' : 'border-white/5'}
                `}
              >
                {/* Company Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl text-white border transition-colors
                      ${(isOffered || isAccepted) ? 'bg-success/20 border-success/30' : isRejected ? 'bg-danger/10 border-danger/20' : 'bg-white/5 border-white/5'}
                    `}>
                      {app.company_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-2xl text-white leading-none mb-1">{app.company_name}</h3>
                      <p className="text-sm text-primaryLight font-medium">{app.role_offered}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Package</p>
                    <p className={`text-xl font-semibold ${(isOffered || isAccepted) ? 'text-success' : 'text-white'}`}>₹{app.package_lpa} LPA</p>
                  </div>
                </div>

                {/* Pipeline Visual */}
                {isRejected ? (
                  <div className="flex items-center gap-3 px-5 py-4 bg-danger/10 border border-danger/20 rounded-2xl">
                    <span className="w-2 h-2 rounded-full bg-danger shrink-0" />
                    <p className="text-sm font-bold text-danger uppercase tracking-widest">Application Not Progressed</p>
                  </div>
                ) : isDeclined ? (
                  <div className="flex items-center gap-3 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl">
                    <span className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{app.status === 'Expired' ? 'Offer Expired' : 'Offer Declined'}</p>
                  </div>
                ) : isAccepted ? (
                  <div className="flex items-center gap-3 px-5 py-4 bg-success/10 border border-success/20 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <p className="text-sm font-bold text-success uppercase tracking-widest">Offer Accepted — You're Placed!</p>
                  </div>
                ) : isOffered ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 bg-success/10 border border-success/20 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <p className="flex-1 text-sm font-bold text-success uppercase tracking-widest">Offer Received — Congratulations!</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => respond(app, "Declined")}
                        disabled={responding === app.id}
                        className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-50"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => respond(app, "Accepted")}
                        disabled={responding === app.id}
                        className="px-4 py-2 rounded-xl bg-success text-xs font-bold text-white hover:bg-success/90 disabled:opacity-50"
                      >
                        Accept offer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {PIPELINE_STAGES.map((stage, idx) => {
                      const isDone = idx < stageIdx;
                      const isActive = idx === stageIdx;
                      return (
                        <div key={stage} className="flex items-center flex-1 last:flex-none">
                          <div className={`flex flex-col items-center gap-2 ${isActive ? 'flex-1' : 'flex-1'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                              ${isDone ? 'bg-primary border-primary' : isActive ? 'bg-primary/20 border-primary' : 'bg-white/5 border-white/10'}
                            `}>
                              {isDone
                                ? <CheckCircle2 className="w-4 h-4 text-white" />
                                : isActive
                                  ? <div className="w-2 h-2 rounded-full bg-primaryLight animate-pulse" />
                                  : <Circle className="w-3 h-3 text-gray-600" />
                              }
                            </div>
                            <span className={`text-[9px] uppercase tracking-widest font-bold whitespace-nowrap
                              ${isDone ? 'text-primaryLight' : isActive ? 'text-white' : 'text-gray-600'}
                            `}>{stage}</span>
                          </div>
                          {idx < PIPELINE_STAGES.length - 1 && (
                            <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all ${isDone ? 'bg-primary' : 'bg-white/5'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 border-t border-white/5 pt-4">
                  <button
                    onClick={() => setHistoryFor(historyFor === app.id ? null : app.id)}
                    aria-expanded={historyFor === app.id}
                    className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-white"
                  >
                    <History className="h-3.5 w-3.5" /> {historyFor === app.id ? "Hide history" : "View history"}
                  </button>
                  {historyFor === app.id && (
                    <div className="mt-4"><Timeline url={`/student/applications/${app.id}/timeline`} /></div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
