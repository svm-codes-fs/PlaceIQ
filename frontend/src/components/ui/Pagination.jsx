import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// "Showing 26–50 of 1,667" with previous/next buttons
export function Pagination({ page, perPage, total, onPage }) {
  if (total <= perPage) return null;
  const pages = Math.ceil(total / perPage);
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const button = "rounded-lg border border-white/10 p-1.5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <nav className="flex items-center justify-between border-t border-white/5 px-5 py-3" aria-label="Pagination">
      <p className="text-xs text-gray-500">
        Showing <b className="text-gray-300">{from.toLocaleString()}–{to.toLocaleString()}</b> of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-2">
        <button className={button} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs tabular-nums text-gray-500">{page} / {pages}</span>
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
