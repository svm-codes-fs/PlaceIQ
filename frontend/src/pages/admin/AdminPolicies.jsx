import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "@/utils/api";
import { Alert, Field, PrimaryButton, TextInput, errorMessage } from "@/components/ui/Form";

export function AdminPolicies() {
  const [policies, setPolicies] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => { api.get("/admin/policies").then(setPolicies); }, []);

  return (
    <div className="max-w-5xl mx-auto pt-6 pb-12 space-y-5 animate-in fade-in duration-500">
      <header>
        <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mb-1">Management</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter leading-tight">
          PLACEMENT <span className="text-gradient">POLICIES.</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Rules your college applies on top of each drive's own criteria. Students see exactly which rule blocks them,
          and the database rejects ineligible applications even if the app is bypassed.
        </p>
      </header>

      {notice && <Alert type={notice.type} items={notice.items}>{notice.text}</Alert>}

      {!policies ? (
        <p className="py-12 text-center text-sm text-gray-600 animate-pulse">Loading policies...</p>
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
    </div>
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
    <div className={`glass-panel rounded-2xl border p-5 transition-colors ${enabled ? "border-primary/30" : "border-white/5"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <ShieldCheck className={`mt-0.5 h-4 w-4 shrink-0 ${enabled ? "text-primaryLight" : "text-gray-600"}`} />
          <div>
            <h2 className="text-sm font-bold text-white">{policy.label}</h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">{policy.description}</p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          aria-label={`${policy.label} ${enabled ? "on" : "off"}`}
          onClick={() => setEnabled(!enabled)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-white/10"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${enabled ? "left-[1.375rem]" : "left-0.5"}`} />
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

      <div className="mt-4 flex justify-end">
        <PrimaryButton onClick={save} disabled={!dirty || saving}>{saving ? "Saving..." : "Save"}</PrimaryButton>
      </div>
    </div>
  );
}
