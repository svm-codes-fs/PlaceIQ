import { cn } from "@/utils/cn";

// Status colour follows meaning: neutral → in progress → positive / negative
const STYLES = {
  Applied: "bg-slate-50 text-slate-700 ring-slate-200",
  Shortlisted: "bg-sky-50 text-sky-700 ring-sky-200",
  Interview: "bg-amber-50 text-amber-800 ring-amber-200",
  Offered: "bg-blue-50 text-blue-700 ring-blue-200",
  Accepted: "bg-green-50 text-green-700 ring-green-200",
  Declined: "bg-slate-50 text-slate-600 ring-slate-200",
  Rejected: "bg-red-50 text-red-700 ring-red-200",
  Expired: "bg-slate-50 text-slate-600 ring-slate-200",
  Upcoming: "bg-blue-50 text-blue-700 ring-blue-200",
  Ongoing: "bg-amber-50 text-amber-800 ring-amber-200",
  Completed: "bg-slate-50 text-slate-600 ring-slate-200",
  Placed: "bg-green-50 text-green-700 ring-green-200",
  Unplaced: "bg-slate-50 text-slate-600 ring-slate-200",
};

const DOTS = {
  Applied: "bg-slate-400", Shortlisted: "bg-sky-500", Interview: "bg-amber-500", Offered: "bg-blue-500",
  Accepted: "bg-green-600", Declined: "bg-slate-400", Rejected: "bg-red-600", Expired: "bg-slate-400",
  Upcoming: "bg-blue-500", Ongoing: "bg-amber-500", Completed: "bg-slate-400", Placed: "bg-green-600",
  Unplaced: "bg-slate-400",
};

export function StatusBadge({ status, className }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
      STYLES[status] || STYLES.Applied,
      className
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[status] || DOTS.Applied)} aria-hidden="true" />
      {status}
    </span>
  );
}
