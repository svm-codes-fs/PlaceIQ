// Dark-theme form controls shared by the admin and auth pages.
import { cn } from "@/utils/cn";

const controlClass =
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50";

export function Field({ label, hint, className, children }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
      {children}
      {hint && <span className="ml-1 block text-[11px] text-gray-600">{hint}</span>}
    </label>
  );
}

export function TextInput({ className, ...props }) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function Select({ className, options, ...props }) {
  return (
    <select className={cn(controlClass, "appearance-none [&>option]:bg-[#101018]", className)} {...props}>
      {options.map((o) => {
        const { value, label } = typeof o === "object" ? o : { value: o, label: o };
        return <option key={value} value={value}>{label}</option>;
      })}
    </select>
  );
}

export function Alert({ type = "error", children, items }) {
  if (!children) return null;
  const styles = type === "success"
    ? "bg-success/10 border-success/20 text-success"
    : "bg-danger/10 border-danger/20 text-danger";
  return (
    <div role={type === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-xs font-bold", styles)}>
      {children}
      {items?.length > 1 && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 font-medium">
          {items.map((i) => <li key={i}>{i}</li>)}
        </ul>
      )}
    </div>
  );
}

export function PrimaryButton({ className, children, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] px-5 py-2.5 text-xs font-bold tracking-wide text-white transition-all hover:shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)] disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ className, children, danger = false, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold tracking-wide transition-all disabled:opacity-50",
        danger
          ? "border-danger/30 text-danger hover:bg-danger/10"
          : "border-white/10 text-gray-300 hover:bg-white/10 hover:text-white",
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
