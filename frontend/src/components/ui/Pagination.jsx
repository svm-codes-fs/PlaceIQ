import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// "Showing 26–50 of 1,667" with previous/next buttons
export function Pagination({ page, perPage, total, onPage }) {
  if (total <= perPage) return null;
  const pages = Math.ceil(total / perPage);
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const button = "inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-muted shadow-card hover:bg-slate-50 hover:text-ink disabled:opacity-40 disabled:hover:bg-white";
  return (
    <nav className="flex items-center justify-between border-t border-line px-4 py-3" aria-label="Pagination">
      <p className="text-sm text-muted">
        Showing <span className="num font-medium text-ink">{from.toLocaleString()}–{to.toLocaleString()}</span> of{" "}
        <span className="num font-medium text-ink">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-2">
        <button className={button} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="num text-sm text-muted">{page} / {pages}</span>
        <button className={button} onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

// Delays a value until it stops changing (for search-as-you-type)
export function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
