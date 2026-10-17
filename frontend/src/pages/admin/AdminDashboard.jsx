import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Briefcase, FileText, TrendingUp, CalendarDays, ArrowRight } from "lucide-react";
import { api } from "@/utils/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar, Card, EmptyState, LoadingRows, Page, PageHeader, StatCard } from "@/components/ui/Page";

const FUNNEL = [
  { status: "Applied", label: "Applied" },
  { status: "Shortlisted", label: "Shortlisted" },
  { status: "Interview", label: "Interview" },
  { status: "Offered", label: "Offer made" },
  { status: "Accepted", label: "Offer accepted" },
];

const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export function AdminDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drives, setDrives] = useState(null);

  useEffect(() => {
    api.get("/admin/dashboard").then(setData).finally(() => setLoading(false));
    api.get("/admin/companies").then((cs) => setDrives(
      cs.filter((c) => c.status === "Upcoming").sort((a, b) => (a.visit_date || "9").localeCompare(b.visit_date || "9")).slice(0, 5)
    )).catch(() => setDrives([]));
  }, []);

  if (loading || !data) {
    return (
      <Page>
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-white" />)}
        </div>
        <div className="h-72 animate-pulse rounded-lg bg-white" />
      </Page>
    );
  }

  const { stats, funnel, recent_applications } = data;
  const funnelMax = Math.max(1, ...FUNNEL.map((f) => funnel[f.status] || 0));

  return (
    <Page>
      <PageHeader
        title="Dashboard"
        description={`Placement overview for ${user?.college?.name || "your college"}.`}
        actions={
          <Link to="/admin/applications" className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink shadow-card hover:bg-slate-50">
            View applications <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={stats.total_students.toLocaleString()} icon={Users} />
        <StatCard label="Recruitment drives" value={stats.total_companies.toLocaleString()} icon={Briefcase} />
        <StatCard label="Applications" value={stats.total_applications.toLocaleString()} icon={FileText} />
        <StatCard
          label="Placement rate"
          value={`${stats.placement_rate}%`}
          hint={`${stats.placed_students.toLocaleString()} of ${stats.total_students.toLocaleString()} students placed`}
          icon={TrendingUp}
          tone="success"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card title="Recent applications" className="lg:col-span-7" flush
          actions={<Link to="/admin/applications" className="text-sm font-medium text-brand hover:text-brand-hover">View all</Link>}>
          {recent_applications.length === 0 ? (
            <EmptyState icon={FileText} title="No applications yet" description="Applications appear here as students apply to drives." />
          ) : (
            <ul className="divide-y divide-line">
              {recent_applications.map((app) => (
                <li key={app.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={app.student_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{app.student_name}</p>
                    <p className="truncate text-sm text-muted">{app.company_name}</p>
                  </div>
                  <StatusBadge status={app.status} />
                  <span className="num hidden w-24 text-right text-xs text-muted sm:block">{fmtDate(app.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recruitment funnel" description="Applications currently at each stage" className="lg:col-span-5">
          <ul className="space-y-4">
            {FUNNEL.map((f) => {
              const count = funnel[f.status] || 0;
              return (
                <li key={f.status}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-ink">{f.label}</span>
                    <span className="num font-medium text-ink">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(count / funnelMax) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          {(funnel.Rejected || 0) > 0 && (
            <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
              <span className="num font-medium text-ink">{funnel.Rejected}</span> rejected
              {(funnel.Declined || 0) > 0 && <> · <span className="num font-medium text-ink">{funnel.Declined}</span> declined</>}
              {(funnel.Expired || 0) > 0 && <> · <span className="num font-medium text-ink">{funnel.Expired}</span> expired</>}
            </p>
          )}
        </Card>
      </div>

      <Card title="Upcoming drives" flush
        actions={<Link to="/admin/companies" className="text-sm font-medium text-brand hover:text-brand-hover">Manage drives</Link>}>
        {!drives ? (
          <LoadingRows rows={3} />
        ) : drives.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No upcoming drives" description="Add a recruitment drive from the Companies page." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Company</th><th>Role</th><th className="text-right">Package</th><th>Eligibility</th><th>Drive date</th><th className="text-right">Applicants</th></tr>
              </thead>
              <tbody>
                {drives.map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.name}</td>
                    <td className="text-muted">{d.role_offered}</td>
                    <td className="num text-right">₹{d.package_lpa} LPA</td>
                    <td className="text-muted">CGPA ≥ {d.min_cgpa} · {d.allowed_branches.join(", ")}</td>
                    <td className="num whitespace-nowrap text-muted">{d.visit_date ? fmtDate(d.visit_date) : "To be announced"}</td>
                    <td className="num text-right">{d.applicant_count}</td>
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
