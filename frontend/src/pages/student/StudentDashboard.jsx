import { useState, useEffect } from "react";
import { ArrowRight, Briefcase, CalendarDays, FileText, GraduationCap, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/utils/api";
import { Avatar, Card, EmptyState, Page, PageHeader, StatCard } from "@/components/ui/Page";

export function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/student/dashboard").then(setData).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <Page>
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-white" />)}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-white" />
      </Page>
    );
  }

  const { student, upcoming_drives, application_stats } = data;

  return (
    <Page>
      <PageHeader
        eyebrow={`Welcome back, ${student.name.split(" ")[0]}`}
        title="Dashboard"
        description={`${student.branch} · CGPA ${student.cgpa}`}
        actions={
          <Link to="/student/companies" className="inline-flex items-center gap-2 rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white shadow-card hover:bg-brand-hover">
            Browse drives <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="CGPA" value={student.cgpa} />
        <StatCard icon={FileText} label="Applications" value={application_stats.total} tone="brand" />
        <StatCard icon={CalendarDays} label="Interviews" value={application_stats.interview} tone={application_stats.interview > 0 ? "warning" : "default"} />
        <StatCard icon={Trophy} label="Offers" value={application_stats.offered} tone={application_stats.offered > 0 ? "success" : "default"} />
      </section>

      <Card
        title="Upcoming drives"
        description="Drives open at your college"
        actions={<Link to="/student/companies" className="text-sm font-medium text-brand hover:text-brand-hover">View all</Link>}
        flush
      >
        {upcoming_drives.length === 0 ? (
          <EmptyState icon={Briefcase} title="No upcoming drives" description="New drives appear here when your placement cell posts them." />
        ) : (
          <ul className="divide-y divide-line">
            {upcoming_drives.map((drive) => (
              <li key={drive.id} className="flex items-center gap-4 px-5 py-3.5">
                <Avatar name={drive.name} className="rounded-md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{drive.name}</p>
                  <p className="truncate text-xs text-muted">{drive.role_offered}</p>
                </div>
                <dl className="hidden shrink-0 gap-8 text-right sm:flex">
                  <Meta label="Package" value={`₹${drive.package_lpa} LPA`} />
                  <Meta label="Min CGPA" value={drive.min_cgpa} />
                  <Meta label="Branches" value={drive.branches} />
                </dl>
                <Link to="/student/companies" className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink shadow-card hover:border-brand hover:text-brand">
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="num text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
