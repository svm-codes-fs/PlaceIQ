import { useState, useEffect } from "react";
import { Briefcase, AlertCircle } from "lucide-react";
import { api } from "@/utils/api";
import { Alert, PrimaryButton, errorMessage } from "@/components/ui/Form";
import { Avatar, Card, EmptyState, LoadingRows, Page, PageHeader, SearchInput, Tabs } from "@/components/ui/Page";
import { StatusBadge } from "@/components/ui/StatusBadge";

const FILTERS = [
  { key: "all", label: "All drives" },
  { key: "eligible", label: "Eligible" },
  { key: "applied", label: "Applied" },
];

export function StudentCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [applyingId, setApplyingId] = useState(null);
  const [message, setMessage] = useState(null);

  const load = () => api.get("/student/companies").then(setCompanies).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleApply = async (company) => {
    setApplyingId(company.id);
    setMessage(null);
    try {
      const data = await api.post(`/student/apply/${company.id}`);
      setMessage({ type: "success", text: data.message });
      await load();
    } catch (err) {
      setMessage({ type: "error", ...errorMessage(err) });
    }
    setApplyingId(null);
  };

  const q = search.toLowerCase();
  const filtered = companies.filter((c) =>
    (c.name.toLowerCase().includes(q) || c.role_offered.toLowerCase().includes(q)) &&
    (filter === "all" ||
      (filter === "eligible" && c.is_eligible && !c.application_status) ||
      (filter === "applied" && c.application_status))
  );

  return (
    <Page>
      <PageHeader
        title="Opportunities"
        description={`${companies.filter((c) => c.is_eligible).length} of ${companies.length} drives match your profile.`}
      />

      {message && <Alert type={message.type} items={message.items}>{message.text}</Alert>}

      <Card flush>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={filter} onChange={setFilter} options={FILTERS} />
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company or role" label="Search companies" />
        </div>
        {loading ? (
          <LoadingRows rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Briefcase} title="No drives found" description="Try a different filter, or check back when new drives are posted." />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((company) => (
              <li key={company.id} className="px-5 py-4">
                <div className="flex items-center gap-4">
                  <Avatar name={company.name} className="rounded-md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{company.name}</p>
                    <p className="truncate text-xs text-muted">{company.role_offered}</p>
                  </div>
                  <dl className="hidden shrink-0 gap-8 text-right md:flex">
                    <Meta label="Package" value={`₹${company.package_lpa} LPA`} />
                    <Meta label="Min CGPA" value={company.min_cgpa} />
                    <Meta label="Max backlogs" value={company.max_backlogs} />
                    <Meta label="Drive date" value={company.visit_date ? new Date(company.visit_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "TBA"} />
                  </dl>
                  <div className="flex w-28 shrink-0 justify-end">
                    {company.application_status ? (
                      <StatusBadge status={company.application_status} />
                    ) : !company.is_eligible ? (
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-muted">Ineligible</span>
                    ) : company.status !== "Upcoming" ? (
                      <StatusBadge status={company.status} />
                    ) : (
                      <PrimaryButton onClick={() => handleApply(company)} disabled={applyingId === company.id}>
                        {applyingId === company.id ? "Applying…" : "Apply"}
                      </PrimaryButton>
                    )}
                  </div>
                </div>
                <p className="num mt-2 pl-12 text-xs text-muted md:hidden">
                  ₹{company.package_lpa} LPA · Min CGPA {company.min_cgpa} · Max backlogs {company.max_backlogs}
                </p>

                {/* Why the student cannot apply */}
                {!company.is_eligible && !company.application_status && (
                  <ul className="mt-3 space-y-1 rounded-md bg-slate-50 px-3 py-2 sm:ml-12">
                    {company.ineligibility_reasons.map((reason) => (
                      <li key={reason} className="flex items-start gap-2 text-xs text-muted">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" /> {reason}
                      </li>
                    ))}
                  </ul>
                )}
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
