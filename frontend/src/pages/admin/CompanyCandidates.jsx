import { useEffect, useState } from "react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/Modal";
import { ScoreBar, SkillChips } from "@/components/ui/SkillInput";
import { StatusBadge } from "@/components/ui/StatusBadge";

// Students ranked by fit for one drive (semantic similarity + required-skill coverage)
export function CompanyCandidates({ company, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    if (company) api.get(`/admin/companies/${company.id}/candidates`).then(setData);
  }, [company]);

  return (
    <Modal open={!!company} onClose={onClose} wide title={`Top candidates for ${company?.name || ""}`}
      subtitle="Eligible students first, then by match score. Missing skills show what to train students on.">
      {!data ? (
        <p className="py-8 text-center text-sm text-gray-600 animate-pulse">Ranking students...</p>
      ) : data.candidates.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No students yet.</p>
      ) : (
        <ol className="divide-y divide-white/5">
          {data.candidates.map((c, i) => (
            <li key={c.id} className={`py-3 ${c.is_eligible ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-3">
                <span className="w-6 text-xs font-bold text-gray-600">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {c.name} <span className="text-[10px] font-normal text-gray-600">{c.roll_no} · {c.branch} · CGPA {c.cgpa.toFixed(2)}</span>
                  </p>
                  {!c.is_eligible && <p className="text-[11px] text-danger/80">{c.ineligibility_reasons[0]}</p>}
                </div>
                {c.application_status && <StatusBadge status={c.application_status} />}
                <ScoreBar score={c.score} />
              </div>
              <div className="mt-2 flex flex-wrap gap-3 pl-9">
                <SkillChips skills={c.matched_skills} tone="matched" />
                <SkillChips skills={c.missing_skills} tone="missing" />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
