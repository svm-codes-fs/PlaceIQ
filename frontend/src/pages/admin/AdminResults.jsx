import { useState, useEffect } from "react";
import { Download, Trophy } from "lucide-react";
import { api } from "@/utils/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { GhostButton } from "@/components/ui/Form";
import { Avatar, Card, EmptyState, LoadingRows, Page, PageHeader, SearchInput, StatCard } from "@/components/ui/Page";

export function AdminResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/admin/results")
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = results.filter(r =>
    r.student_name.toLowerCase().includes(search.toLowerCase()) ||
    r.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const exportCsv = () => {
    const cols = ["student_name", "student_roll", "branch", "company_name", "role_offered", "package_lpa", "offer_date", "status"];
    const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...filtered.map((r) => cols.map((c) => quote(r[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: "placement-results.csv" });
    link.click();
    URL.revokeObjectURL(url);
  };

  const accepted = results.filter((r) => r.status === "Accepted");
  const pending = results.filter((r) => r.status === "Offered").length;
  const packages = accepted.map((r) => r.package_lpa);
  const highest = packages.length ? Math.max(...packages) : null;

  return (
    <Page>
      <PageHeader
        title="Results"
        description="Offers made to students and how they responded."
        actions={
          <GhostButton onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </GhostButton>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Offers made" value={results.length} />
        <StatCard label="Accepted" value={accepted.length} tone="success" />
        <StatCard label="Awaiting response" value={pending} />
        <StatCard label="Highest accepted package" value={highest != null ? `₹${highest} LPA` : "—"} />
      </section>

      <Card flush>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student or company" label="Search results" />
          <p className="num text-sm text-muted">{filtered.length} shown</p>
        </div>
        {loading ? (
          <LoadingRows rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Trophy} title={search ? "No matching results" : "No offers yet"}
            description={search ? "Try a different student or company." : "Offers appear here once you make them from the Applications page."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Student</th><th>Branch</th><th>Company &amp; role</th><th className="text-right">Package</th><th>Offer date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map((res) => (
                  <tr key={res.id}>
                    <td className="max-w-[16rem]">
                      <div className="flex items-center gap-3">
                        <Avatar name={res.student_name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium" title={res.student_name}>{res.student_name}</p>
                          <p className="num text-xs text-muted">{res.student_roll}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{res.branch}</td>
                    <td className="max-w-[16rem]">
                      <p className="truncate font-medium" title={res.company_name}>{res.company_name}</p>
                      <p className="truncate text-xs text-muted">{res.role_offered}</p>
                    </td>
                    <td className="num whitespace-nowrap text-right font-medium">₹{res.package_lpa} LPA</td>
                    <td className="num whitespace-nowrap text-muted">
                      {res.offer_date ? new Date(res.offer_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td><StatusBadge status={res.status} /></td>
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
