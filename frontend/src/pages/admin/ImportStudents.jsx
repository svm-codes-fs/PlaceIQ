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
          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 px-4 py-4 text-sm text-gray-400 hover:border-primary/50">
            <FileUp className="h-4 w-4 text-primaryLight" />
            <span className="truncate">{file ? file.name : "Choose a .csv file"}</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { setFile(e.target.files[0]); setJob(null); }} />
          </label>
          <a href="/api/admin/students/import-template" className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white">
            <Download className="h-3.5 w-3.5" /> Template
          </a>
        </div>
        <p className="text-[11px] text-gray-600">
          Columns: username, email, name, roll_no, branch, cgpa, backlogs, phone (optional), password (optional — if blank,
          the student is emailed a temporary password).
        </p>

        {job && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            {running && <p className="text-sm text-gray-400 animate-pulse">Checking {job.total_rows || ""} rows...</p>}
            {job.status === "succeeded" && (
              <p className="flex items-center gap-2 text-sm font-bold text-success">
                <CheckCircle2 className="h-4 w-4" /> Imported {job.created_count} students.
              </p>
            )}
            {job.status === "failed" && (
              <>
                <p className="flex items-center gap-2 text-sm font-bold text-danger">
                  <XCircle className="h-4 w-4" /> Nothing was imported. Fix these rows and upload again:
                </p>
                <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto text-xs">
                  {job.errors.map((e) => (
                    <li key={e.row} className="rounded-lg bg-danger/5 px-3 py-2">
                      <span className="font-bold text-white">{e.row > 1 ? `Row ${e.row}` : "File"}:</span>{" "}
                      <span className="text-gray-400">{e.errors.join(" ")}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <GhostButton onClick={onClose}>{job?.status === "succeeded" ? "Done" : "Cancel"}</GhostButton>
          <PrimaryButton onClick={upload} disabled={!file || running}>{running ? "Importing..." : "Import"}</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
