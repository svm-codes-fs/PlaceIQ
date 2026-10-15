import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, User, Phone, GraduationCap, FileDigit } from "lucide-react";

export function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', cgpa: '', backlogs: '' });

  useEffect(() => {
    fetch("/api/student/profile")
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setFormData({ name: data.name, phone: data.phone, cgpa: data.cgpa, backlogs: data.backlogs });
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/student/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setMessage({ type: res.ok ? 'success' : 'error', text: data.message || data.error });
      if (res.ok) setProfile({ ...profile, ...formData });
    } catch {
      setMessage({ type: 'error', text: "Failed to update profile." });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="max-w-6xl mx-auto py-24 text-center animate-pulse text-gray-500">Loading profile...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-16 animate-in fade-in duration-700 pb-20 pt-8">

      <header className="border-b border-white/10 pb-8">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tighter leading-[1.1] mb-4">
          MY PROFILE.
        </h1>
        <p className="text-lg text-gray-400 font-light max-w-lg leading-relaxed">
          Keep your academic details current to ensure maximum eligibility.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-10">

        {/* Left Identity Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-panel border border-white/5 rounded-3xl overflow-hidden relative">
            <div className="h-28 bg-gradient-to-br from-[#7C3AED] to-[#2563EB] relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'100%25\' height=\'100%25\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3CradialGradient id=\'g\'%3E%3Cstop offset=\'0%25\' stop-opacity=\'.1\' stop-color=\'white\'/%3E%3Cstop offset=\'100%25\' stop-opacity=\'0\' stop-color=\'white\'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill=\'url(%23g)\' width=\'100%25\' height=\'100%25\'/%3E%3C/svg%3E')]" />
            </div>
            <div className="px-7 pb-7 pt-0 relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] shadow-[0_0_30px_-5px_rgba(124,58,237,0.5)] flex items-center justify-center font-bold text-3xl text-white -mt-10 mb-5 relative z-10">
                {profile.name.charAt(0)}
              </div>
              <h3 className="font-bold text-xl text-white mb-1">{profile.name}</h3>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">{profile.roll_no}</p>
              <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border
                ${profile.placement_status === 'Placed' ? 'bg-success/20 text-success border-success/30' : 'bg-white/5 text-gray-500 border-white/10'}
              `}>
                {profile.placement_status}
              </span>
            </div>
          </div>

          <div className="glass-panel border border-white/5 rounded-3xl p-7 space-y-5">
            <h4 className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">Academic Details</h4>
            <InfoRow label="Roll No." value={profile.roll_no} />
            <InfoRow label="Branch" value={profile.branch} />
            <InfoRow label="Email" value={profile.email} />
          </div>
        </div>

        {/* Right Form */}
        <div className="md:col-span-2">
          <div className="glass-panel border border-white/5 rounded-3xl p-8">
            <h3 className="text-lg font-bold text-white mb-2">Update Information</h3>
            <p className="text-sm text-gray-500 mb-8">Changes to CGPA and backlogs affect your eligibility for recruitment drives.</p>

            {message && (
              <div className={`mb-8 p-4 rounded-2xl border text-sm font-bold flex items-center gap-3
                ${message.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}
              `}>
                {message.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { name: 'name', label: 'Full Name', icon: User, type: 'text', placeholder: 'Your full name' },
                  { name: 'phone', label: 'Phone Number', icon: Phone, type: 'text', placeholder: 'e.g. 9876543210' },
                  { name: 'cgpa', label: 'Current CGPA', icon: GraduationCap, type: 'number', placeholder: '0.00 – 10.00', step: '0.01', min: '0', max: '10' },
                  { name: 'backlogs', label: 'Active Backlogs', icon: FileDigit, type: 'number', placeholder: '0', min: '0' },
                ].map(field => (
                  <div key={field.name} className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 tracking-widest uppercase flex items-center gap-2">
                      <field.icon className="w-3 h-3" /> {field.label}
                    </label>
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      step={field.step}
                      min={field.min}
                      max={field.max}
                      required={field.name === 'name' || field.name === 'cgpa' || field.name === 'backlogs'}
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-600 text-sm font-medium"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-10 py-4 bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white font-bold text-sm tracking-wide rounded-xl hover:shadow-[0_0_30px_-5px_rgba(124,58,237,0.5)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">{label}</p>
      <p className="text-sm font-semibold text-white truncate">{value}</p>
    </div>
  );
}
