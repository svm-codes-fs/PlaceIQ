import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Hexagon } from "lucide-react";
import { api } from "@/utils/api";
import { Alert, Field, PrimaryButton, Select, TextInput, errorMessage } from "@/components/ui/Form";

const BRANCHES = ["CSE", "ECE", "ME", "CE", "EE", "CHE"];

const EMPTY = {
  college_id: "", username: "", email: "", password: "", name: "",
  roll_no: "", phone: "", branch: "CSE", cgpa: "", backlogs: "0",
};

export function Register({ onLogin }) {
  const [colleges, setColleges] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/colleges").then(setColleges).catch(() => setColleges([]));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = await api.post("/auth/register", { ...form, college_id: Number(form.college_id) });
      onLogin(data.user);
      navigate("/student");
    } catch (err) {
      setError(errorMessage(err));
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#07070A] px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Hexagon className="h-7 w-7 text-white fill-white/10" />
          <span className="text-lg font-bold tracking-[0.2em] text-white">PLACEIQ</span>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#12121A]/70 p-8 md:p-10">
          <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-white">CREATE YOUR ACCOUNT.</h1>
          <p className="mb-8 text-sm text-white/60">Register as a student at your college.</p>

          <form onSubmit={submit} className="space-y-5">
            {error && <Alert items={error.items}>{error.text}</Alert>}

            <Field label="College">
              <Select
                required
                value={form.college_id}
                onChange={set("college_id")}
                options={[{ value: "", label: "Choose your college" },
                  ...colleges.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))]}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name"><TextInput required value={form.name} onChange={set("name")} autoComplete="name" /></Field>
              <Field label="Roll number"><TextInput required value={form.roll_no} onChange={set("roll_no")} /></Field>
              <Field label="Username"><TextInput required value={form.username} onChange={set("username")} autoComplete="username" /></Field>
              <Field label="Email"><TextInput required type="email" value={form.email} onChange={set("email")} autoComplete="email" /></Field>
              <Field label="Password" hint="At least 8 characters">
                <TextInput required type="password" minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" />
              </Field>
              <Field label="Phone (optional)"><TextInput value={form.phone} onChange={set("phone")} autoComplete="tel" /></Field>
              <Field label="Branch"><Select value={form.branch} onChange={set("branch")} options={BRANCHES} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CGPA"><TextInput required type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={set("cgpa")} /></Field>
                <Field label="Backlogs"><TextInput required type="number" min="0" value={form.backlogs} onChange={set("backlogs")} /></Field>
              </div>
            </div>

            <PrimaryButton type="submit" disabled={saving} className="w-full py-3.5 text-sm">
              {saving ? "Creating account..." : "Create account"}
            </PrimaryButton>
          </form>

          <p className="mt-6 text-center text-sm text-white/50">
            Already registered?{" "}
            <Link to="/login" className="font-bold text-[#a78bfa] hover:text-white">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
