import { useState, useEffect, useCallback } from "react";
import { FileText, History } from "lucide-react";
import { api } from "@/utils/api";
import { Alert, IconButton, Select } from "@/components/ui/Form";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Timeline } from "@/components/ui/Timeline";
import { Pagination, useDebounced } from "@/components/ui/Pagination";
import { Avatar, Card, EmptyState, LoadingRows, Page, PageHeader, SearchInput } from "@/components/ui/Page";
import { cn } from "@/utils/cn";

const PER_PAGE = 25;
const STATUS_FILTERS = ["Applied", "Shortlisted", "Interview", "Offered", "Accepted", "Declined", "Rejected", "Expired"];

// Button label for each move the state machine allows
const ACTION_LABELS = {
  Shortlisted: "Shortlist",
  Interview: "Move to interview",
  Offered: "Make offer",
  Rejected: "Reject",
};

export function AdminApplications() {
  const [data, setData] = useState({ items: [], total: 0, status_counts: {} });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);

  const query = useDebounced(search);
  const fetchApplications = useCallback(() =>
    api.get(`/admin/applications?page=${page}&per_page=${PER_PAGE}&q=${encodeURIComponent(query)}${status ? `&status=${status}` : ""}`)
      .then(setData).finally(() => setLoading(false)), [page, query, status]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);
  useEffect(() => { setPage(1); }, [query, status]);

  const handleStatusChange = async (app, newStatus) => {
    if (newStatus === "Rejected" && !window.confirm(`Reject ${app.student_name} for ${app.company_name}? This can't be undone.`)) return;
    setUpdating(app.id);
    setError(null);
    try {
      const res = await api.post(`/admin/applications/${app.id}/status`, { status: newStatus });
      setData((d) => ({ ...d, items: d.items.map((a) => (a.id === app.id ? res.application : a)) }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const filteredApps = data.items;
  const totalAll = Object.values(data.status_counts).reduce((a, b) => a + b, 0);

  return (
    <Page>
      <PageHeader
        title="Applications"
        description={`${totalAll.toLocaleString()} applications · ${(data.status_counts.Accepted || 0).toLocaleString()} offers accepted`}
      />

      {error && <Alert>{error}</Alert>}

      <Card flush>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student or company" label="Search applications" inputClassName="sm:w-80" />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="sm:w-52"
            options={[{ value: "", label: `All statuses (${totalAll})` },
              ...STATUS_FILTERS.map((s) => ({ value: s, label: `${s} (${data.status_counts[s] || 0})` }))]}
          />
          <p className="num text-sm text-muted sm:ml-auto">{data.total.toLocaleString()} {data.total === 1 ? "result" : "results"}</p>
        </div>

        {loading ? (
          <LoadingRows rows={6} />
        ) : filteredApps.length === 0 ? (
          <EmptyState icon={FileText} title="No applications found"
            description={search || status ? "Try a different search or status." : "Applications appear here as students apply to drives."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Student</th><th>Company &amp; role</th><th>Applied</th><th>Status</th><th>Next step</th><th><span className="sr-only">History</span></th></tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => (
                  <tr key={app.id} className={cn(updating === app.id && "pointer-events-none opacity-50")}>
                    <td className="max-w-[16rem]">
                      <div className="flex items-center gap-3">
                        <Avatar name={app.student_name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium" title={app.student_name}>{app.student_name}</p>
                          <p className="num text-xs text-muted">{app.student_roll}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[16rem]">
                      <p className="truncate font-medium" title={app.company_name}>{app.company_name}</p>
                      <p className="truncate text-xs text-muted" title={app.role_offered}>{app.role_offered}</p>
                    </td>
                    <td className="num whitespace-nowrap text-muted">
                      {new Date(app.applied_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td>
                      <StatusBadge status={app.status} />
                      {app.status === "Offered" && <p className="mt-1 text-xs text-muted">Awaiting student response</p>}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        {app.allowed_transitions.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(app, s)}
                            className={cn(
                              "whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium shadow-card transition-colors",
                              s === "Rejected"
                                ? "border-red-200 bg-white text-danger hover:bg-danger-soft"
                                : "border-line bg-white text-ink hover:border-brand hover:text-brand"
                            )}
                          >
                            {ACTION_LABELS[s] || s}
                          </button>
                        ))}
                        {app.allowed_transitions.length === 0 && <span className="text-xs text-slate-400">No further action</span>}
                      </div>
                    </td>
                    <td className="text-right">
                      <IconButton onClick={() => setHistoryFor(app)} aria-label={`History of ${app.student_name}'s application to ${app.company_name}`} title="View history">
                        <History className="h-4 w-4" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} perPage={PER_PAGE} total={data.total} onPage={setPage} />
      </Card>

      <Modal open={!!historyFor} onClose={() => setHistoryFor(null)} title="Application history"
        subtitle={historyFor && `${historyFor.student_name} · ${historyFor.company_name}`}>
        {historyFor && <Timeline url={`/admin/applications/${historyFor.id}/timeline`} />}
      </Modal>
    </Page>
  );
}
