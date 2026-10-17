// Form controls and buttons shared across the app.
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";

const controlClass =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink shadow-card placeholder:text-slate-400 " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-muted";

export function Field({ label, hint, className, children }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput({ className, ...props }) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn(controlClass, "leading-relaxed", className)} {...props} />;
}

export function Select({ className, options, ...props }) {
  return (
    <select className={cn(controlClass, "pr-8", className)} {...props}>
      {options.map((o) => {
        const { value, label } = typeof o === "object" ? o : { value: o, label: o };
        return <option key={value} value={value}>{label}</option>;
      })}
    </select>
  );
}

export function Alert({ type = "error", children, items }) {
  if (!children) return null;
  const success = type === "success";
  const Icon = success ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={success ? "status" : "alert"}
      className={cn(
        "flex gap-3 rounded-md border px-4 py-3 text-sm",
        success ? "border-green-200 bg-success-soft text-success" : "border-red-200 bg-danger-soft text-danger"
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-medium">{children}</p>
        {items?.length > 1 && (
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] opacity-90">
            {items.map((i) => <li key={i}>{i}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function PrimaryButton({ className, children, ...props }) {
  return (
    <button className={cn(buttonBase, "bg-brand text-white shadow-card hover:bg-brand-hover", className)} {...props}>
      {children}
    </button>
  );
}

export function GhostButton({ className, children, danger = false, ...props }) {
  return (
    <button
      className={cn(
        buttonBase,
        "border bg-white shadow-card",
        danger ? "border-red-200 text-danger hover:bg-danger-soft" : "border-line text-ink hover:bg-slate-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DangerButton({ className, children, ...props }) {
  return (
    <button className={cn(buttonBase, "bg-danger text-white shadow-card hover:bg-red-800", className)} {...props}>
      {children}
    </button>
  );
}

// Small square icon button for table row actions
export function IconButton({ className, danger = false, children, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors",
        danger ? "hover:bg-danger-soft hover:text-danger" : "hover:bg-slate-100 hover:text-ink",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Turns an ApiError into the {text, items} shape Alert expects
export function errorMessage(err) {
  return { text: err.message, items: err.data?.errors || err.data?.reasons || [] };
}
