import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function Modal({ open, title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Rendered on <body> so the overlay sits above the sidebar and header, not inside <main>'s stacking layer
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm px-4 py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} rounded-2xl border border-white/10 bg-[#101018] shadow-2xl`}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/5 px-6 py-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-white">{title}</h2>
                {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
