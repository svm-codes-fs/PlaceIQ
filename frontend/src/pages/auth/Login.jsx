import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api, HOME } from "@/utils/api";
import { Alert, Field, PrimaryButton, TextInput } from "@/components/ui/Form";

export function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api.post("/auth/login", { username, password });
      onLogin(data.user);
      navigate(HOME[data.user.role]);
    } catch (err) {
      setError(err.message || "An error occurred during login.");
    }

    setLoading(false);
  };

  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Use the account your placement cell gave you, or the one you registered.</p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          {error && <Alert>{error}</Alert>}

          <Field label="Username or email">
            <TextInput
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </Field>

          <Field label="Password">
            <TextInput
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          <PrimaryButton type="submit" disabled={loading} className="w-full py-2.5">
            {loading ? "Signing in…" : "Sign in"}
          </PrimaryButton>
        </form>

        <p className="mt-6 text-sm text-muted">
          New student?{" "}
          <Link to="/register" className="font-medium text-brand hover:text-brand-hover">Create an account</Link>
        </p>
      </div>
    </AuthShell>
  );
}

// Two-column auth layout: navy brand panel on large screens, form on white.
export function AuthShell({ children, wide = false }) {
  return (
    <div className="flex min-h-screen bg-white">
      <aside className="hidden w-[420px] shrink-0 flex-col justify-between bg-navy p-10 text-white lg:flex">
        <Brand />
        <div>
          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-white">Campus placements, from drive to offer.</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Placement cells run drives, eligibility rules and offers in one place. Students see which drives they qualify for, apply, and track every step.
          </p>
        </div>
        <p className="text-xs text-slate-400">PlaceIQ · Campus recruitment platform</p>
      </aside>
      <main className={`flex flex-1 flex-col px-4 py-10 sm:px-8 ${wide ? "" : "justify-center"}`}>
        <div className="mb-10 lg:hidden"><Brand dark /></div>
        <div className="flex flex-1 items-start justify-center lg:items-center">{children}</div>
      </main>
    </div>
  );
}

function Brand({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white"><GraduationCap className="h-4 w-4" /></span>
      <span className={`text-base font-semibold ${dark ? "text-ink" : "text-white"}`}>PlaceIQ</span>
    </div>
  );
}
