import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileUp, XCircle } from "lucide-react";
import { api } from "@/utils/api";
import { useNotifications } from "@/utils/notifications";
import { Modal } from "@/components/ui/Modal";
import { Alert, GhostButton, PrimaryButton } from "@/components/ui/Form";

// Upload a CSV of students; a background worker validates every row and imports all or nothing
export function ImportStudents({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const { subscribe } = useNotifications();

  useEffect(() => { if (open) { setFile(null); setJob(null); setError(null); } }, [open]);

  // The worker pushes "import_finished"; poll as a fallback while the job runs
  useEffect(() => {
    if (!job || !["pending", "running"].includes(job.status)) return undefined;
    const unsubscribe = subscribe((event, data) => { if (event === "import_finished" && data.id === job.id) setJob(data); });
    const timer = setInterval(() => api.get(`/admin/imports/${job.id}`).then(setJob).catch(() => {}), 1500);
    return () => { unsubscribe(); clearInterval(timer); };
  }, [job, subscribe]);

  useEffect(() => { if (job?.status === "succeeded") onImported(job); }, [job?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async () => {
    setError(null);
    try {
      setJob(await api.upload("/admin/students/import", file));
    } catch (err) {
      setError(err.message);
    }
  };

  const running = job && ["pending", "running"].includes(job.status);

  return (
    <Modal open={open} onClose={onClose} title="Import students from CSV" wide
      subtitle="Every row is checked first. If any row has a problem, nothing is imported.">
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-muted transition-colors hover:border-brand hover:bg-brand-soft/40">
            <FileUp className="h-4 w-4 text-brand" />
            <span className="truncate">{file ? <span className="font-medium text-ink">{file.name}</span> : "Choose a .csv file"}</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { setFile(e.target.files[0]); setJob(null); }} />
          </label>
          <a href="/api/admin/students/import-template" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover">
            <Download className="h-4 w-4" /> Download template
          </a>
        </div>
        <p className="text-xs text-muted">
          Columns: <span className="font-mono">username, email, name, roll_no, branch, cgpa, backlogs</span>, plus optional{" "}
          <span className="font-mono">phone</span> and <span className="font-mono">password</span>. Students without a password are emailed a temporary one.
        </p>

        {job && (
          <div className="rounded-md border border-line p-4">
            {running && <p className="text-sm text-muted">Checking {job.total_rows || ""} rows…</p>}
            {job.status === "succeeded" && (
              <p className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" /> Imported {job.created_count} students.
              </p>
            )}
            {job.status === "failed" && (
              <>
                <p className="flex items-center gap-2 text-sm font-medium text-danger">
                  <XCircle className="h-4 w-4" /> Nothing was imported. Fix these rows and upload again:
                </p>
                <ul className="mt-3 max-h-60 divide-y divide-line overflow-y-auto rounded-md border border-line text-sm">
                  {job.errors.map((e) => (
                    <li key={e.row} className="flex gap-3 px-3 py-2">
                      <span className="num w-14 shrink-0 font-medium text-ink">{e.row > 1 ? `Row ${e.row}` : "File"}</span>
                      <span className="text-muted">{e.errors.join(" ")}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <GhostButton onClick={onClose}>{job?.status === "succeeded" ? "Done" : "Cancel"}</GhostButton>
          <PrimaryButton onClick={upload} disabled={!file || running}>{running ? "Importing…" : "Import"}</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
