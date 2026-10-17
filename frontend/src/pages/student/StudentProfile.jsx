import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { Alert, Field, PrimaryButton, TextInput } from "@/components/ui/Form";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar, Card, LoadingRows, Page, PageHeader } from "@/components/ui/Page";

export function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });

  useEffect(() => {
    api.get("/student/profile")
      .then(data => {
        setProfile(data);
        setFormData({ name: data.name, phone: data.phone });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const data = await api.put("/student/profile", formData);
      setMessage({ type: 'success', text: data.message });
      setProfile(data.profile);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || "Failed to update profile." });
    }
    setSaving(false);
  };

  if (loading || !profile) {
    return <Page className="max-w-5xl"><LoadingRows rows={4} className="p-0" /></Page>;
  }

  return (
    <Page className="max-w-5xl">
      <PageHeader title="Profile" description="Your academic record decides which drives you can apply to." />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1" title="Academic record" description="Maintained by your placement cell">
          <div className="mb-5 flex items-center gap-3">
            <Avatar name={profile.name} className="h-11 w-11 text-sm" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{profile.name}</p>
              <div className="mt-1"><StatusBadge status={profile.placement_status} /></div>
            </div>
          </div>
          <dl className="space-y-3">
            <InfoRow label="Roll number" value={profile.roll_no} />
            <InfoRow label="Branch" value={profile.branch} />
            <InfoRow label="CGPA" value={profile.cgpa.toFixed(2)} />
            <InfoRow label="Active backlogs" value={profile.backlogs} />
            <InfoRow label="Email" value={profile.email} />
          </dl>
        </Card>

        <Card className="md:col-span-2" title="Contact details"
          description="CGPA and backlogs are maintained by your placement office. Contact them if your record is out of date.">
          <form onSubmit={handleSubmit} className="space-y-5">
            {message && <Alert type={message.type}>{message.text}</Alert>}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name">
                <TextInput id="profile-name" type="text" name="name" value={formData.name} onChange={handleChange} required />
              </Field>
              <Field label="Phone number">
                <TextInput id="profile-phone" type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="e.g. 9876543210" />
              </Field>
            </div>
            <div className="flex justify-end">
              <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</PrimaryButton>
            </div>
          </form>
        </Card>
      </div>
    </Page>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="num truncate text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
