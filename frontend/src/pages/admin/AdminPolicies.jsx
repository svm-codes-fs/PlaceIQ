import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "@/utils/api";
import { Alert, Field, PrimaryButton, TextInput, errorMessage } from "@/components/ui/Form";
import { LoadingRows, Page, PageHeader } from "@/components/ui/Page";

export function AdminPolicies() {
  const [policies, setPolicies] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => { api.get("/admin/policies").then(setPolicies); }, []);

  return (
    <Page className="max-w-5xl">
      <PageHeader
        title="Placement policies"
        description="Rules your college applies on top of each drive's own criteria. Students see exactly which rule blocks them, and the database rejects ineligible applications even if the app is bypassed."
      />

      {notice && <Alert type={notice.type} items={notice.items}>{notice.text}</Alert>}

      {!policies ? (
        <LoadingRows rows={4} className="p-0" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {policies.map((p) => (
            <PolicyCard
              key={p.rule_type}
              policy={p}
              onSaved={(list, text) => { setPolicies(list); setNotice({ type: "success", text }); }}
              onError={(err) => setNotice({ type: "error", ...errorMessage(err) })}
            />
          ))}
        </div>
      )}
    </Page>
  );
}

function PolicyCard({ policy, onSaved, onError }) {
  const [enabled, setEnabled] = useState(policy.enabled);
  const [params, setParams] = useState(policy.params);
  const [saving, setSaving] = useState(false);
  const dirty = enabled !== policy.enabled || JSON.stringify(params) !== JSON.stringify(policy.params);

  const save = async () => {
    setSaving(true);
    try {
      const list = await api.put(`/admin/policies/${policy.rule_type}`, { enabled, params });
      onSaved(list, `${policy.label} ${enabled ? "enabled" : "disabled"}.`);
    } catch (err) {
      onError(err);
    }
    setSaving(false);
  };

  return (
    <div className={`flex flex-col rounded-lg border bg-white p-5 shadow-card transition-colors ${enabled ? "border-blue-200" : "border-line"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${enabled ? "bg-brand-soft text-brand" : "bg-slate-100 text-slate-500"}`}><ShieldCheck className="h-4 w-4" /></span>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">{policy.label}<span className={`rounded px-1.5 py-0.5 text-2xs font-medium ${enabled ? "bg-green-50 text-success" : "bg-slate-100 text-muted"}`}>{enabled ? "On" : "Off"}</span></h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{policy.description}</p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          aria-label={`${policy.label} ${enabled ? "on" : "off"}`}
          onClick={() => setEnabled(!enabled)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? "bg-brand" : "bg-slate-300"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled ? "left-[1.375rem]" : "left-0.5"}`} />
        </button>
      </div>

      {Object.keys(policy.param_specs).length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(policy.param_specs).map(([key, spec]) => (
            <Field key={key} label={spec.label}>
              <TextInput
                type="number"
                step={spec.type === "int" ? 1 : 0.01}
                min={spec.min}
                max={spec.max}
                value={params[key]}
                onChange={(e) => setParams((p) => ({ ...p, [key]: e.target.value }))}
              />
            </Field>
          ))}
        </div>
      )}

      <div className="mt-auto flex justify-end pt-4">
        <PrimaryButton onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : "Save changes"}</PrimaryButton>
      </div>
    </div>
  );
}
