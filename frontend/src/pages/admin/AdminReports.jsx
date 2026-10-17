import { useState, useEffect } from "react";
import { TrendingUp, Users, CheckCircle2, UserX, BarChart3 } from "lucide-react";
import { api } from "@/utils/api";
import { Card, EmptyState, Page, PageHeader, StatCard } from "@/components/ui/Page";

export function AdminReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/reports").then(setReport).finally(() => setLoading(false));
  }, []);

  if (loading || !report) {
    return (
      <Page>
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-white" />)}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-white" />
      </Page>
    );
  }

  const unplaced = report.overview.total_students - report.overview.placed_students;
  const branches = [...report.branch_metrics].sort((a, b) => b.rate - a.rate);

  return (
    <Page>
      <PageHeader title="Reports" description="Placement performance across the college and by branch." />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Placement rate" value={`${report.overview.overall_rate}%`} tone="brand" />
        <StatCard icon={Users} label="Students" value={report.overview.total_students.toLocaleString()} />
        <StatCard icon={CheckCircle2} label="Placed" value={report.overview.placed_students.toLocaleString()} tone="success" />
        <StatCard icon={UserX} label="Not yet placed" value={unplaced.toLocaleString()} tone={unplaced > 0 ? "warning" : "default"} />
      </section>

      <Card title="Placement rate by branch" description="Share of each branch's students who have accepted an offer (0–100%)" flush>
        {branches.length === 0 ? (
          <EmptyState icon={BarChart3} title="No branch data yet" description="Branch figures appear once students are registered." />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {branches.map((bm) => (
                <li key={bm.branch} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="w-12 shrink-0 text-sm font-medium text-ink">{bm.branch}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${bm.branch}: ${bm.rate}% placed`}>
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, bm.rate)}%` }} />
                  </div>
                  <span className="num w-14 shrink-0 text-right text-sm font-semibold text-ink">{bm.rate}%</span>
                  <span className="num hidden w-24 shrink-0 text-right text-sm text-muted sm:block">{bm.placed} of {bm.total}</span>
                </li>
              ))}
            </ul>
            <details className="border-t border-line px-5 py-3">
              <summary className="cursor-pointer text-sm font-medium text-brand hover:text-brand-hover">Show as table</summary>
              <div className="mt-3 overflow-x-auto rounded-md border border-line">
                <table className="table-base">
                  <thead><tr><th>Branch</th><th className="text-right">Students</th><th className="text-right">Placed</th><th className="text-right">Placement rate</th></tr></thead>
                  <tbody>
                    {branches.map((bm) => (
                      <tr key={bm.branch}>
                        <td className="font-medium">{bm.branch}</td>
                        <td className="num text-right">{bm.total}</td>
                        <td className="num text-right">{bm.placed}</td>
                        <td className="num text-right">{bm.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </Card>
    </Page>
  );
}
