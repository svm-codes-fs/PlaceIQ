import { useEffect, useState } from "react";
import { AlertCircle, Users } from "lucide-react";
import { api } from "@/utils/api";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, LoadingRows } from "@/components/ui/Page";
import { ScoreBar, SkillChips } from "@/components/ui/SkillInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/utils/cn";

// Students ranked by fit for one drive (semantic similarity + required-skill coverage)
export function CompanyCandidates({ company, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    if (company) api.get(`/admin/companies/${company.id}/candidates`).then(setData);
  }, [company]);

  return (
    <Modal open={!!company} onClose={onClose} wide title={`Top candidates for ${company?.name || ""}`}
      subtitle="Eligible students first, ranked by match score. Missing skills show what to train students on.">
      {!data ? (
        <LoadingRows rows={4} className="p-0" />
      ) : data.candidates.length === 0 ? (
        <EmptyState icon={Users} title="No students yet" />
      ) : (
        <ol className="-mx-5 divide-y divide-line border-y border-line">
          {data.candidates.map((c, i) => (
            <li key={c.id} className={cn("px-5 py-3.5", !c.is_eligible && "bg-slate-50/60")}>
              <div className="flex items-start gap-3">
                <span className="num w-7 pt-0.5 text-sm font-medium text-muted">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{c.name}</p>
                  <p className="num text-xs text-muted">{c.roll_no} · {c.branch} · CGPA {c.cgpa.toFixed(2)}</p>
                  {!c.is_eligible && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-danger">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {c.ineligibility_reasons[0]}
                    </p>
                  )}
                  {(c.matched_skills.length > 0 || c.missing_skills.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
                      <SkillChips skills={c.matched_skills} tone="matched" />
                      <SkillChips skills={c.missing_skills} tone="missing" />
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <ScoreBar score={c.score} />
                  {c.application_status && <StatusBadge status={c.application_status} />}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {data?.candidates.length > 0 && (
        <p className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-green-500" /> Has the skill</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-500" /> Missing skill</span>
        </p>
      )}
    </Modal>
  );
}
