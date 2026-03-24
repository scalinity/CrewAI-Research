import { useState, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

let collapsibleIdCounter = 0;

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const idRef = useRef(`collapsible-${++collapsibleIdCounter}`);
  const panelId = `${idRef.current}-panel`;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight size={12} aria-hidden="true" />
        </motion.span>
        {title && <span>{title}</span>}
        {!title && <span>{open ? "Collapse" : "Expand"}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-label={title ?? "Collapsible content"}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
