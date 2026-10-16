import { cn } from "@/utils/cn";

const STYLES = {
  Applied: "bg-white/10 text-gray-300",
  Shortlisted: "bg-secondary/15 text-secondary",
  Interview: "bg-warning/15 text-warning",
  Offered: "bg-primary/20 text-primaryLight",
  Accepted: "bg-success/20 text-success",
  Declined: "bg-white/5 text-gray-500",
  Rejected: "bg-danger/20 text-danger",
  Expired: "bg-white/5 text-gray-500",
  Upcoming: "bg-primary/20 text-primaryLight",
  Ongoing: "bg-warning/20 text-warning",
  Completed: "bg-white/10 text-gray-400",
  Placed: "bg-success/20 text-success",
  Unplaced: "bg-white/5 text-gray-500",
};

export function StatusBadge({ status, className }) {
  return (
    <span className={cn(
      "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
      STYLES[status] || STYLES.Applied,
      className
    )}>
      {status}
    </span>
  );
}
