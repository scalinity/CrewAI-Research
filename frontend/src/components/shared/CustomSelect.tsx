import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

let selectIdCounter = 0;

export function CustomSelect({
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
  icon,
  width = "auto",
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
  icon?: React.ReactNode;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`cs-${++selectIdCounter}`);
  const listboxId = `${idRef.current}-listbox`;
  const selectedOption = options.find((o) => o.value === value);

  const close = useCallback(() => {
    setOpen(false);
    setFocusedIndex(-1);
  }, []);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      close();
    },
    [onChange, close]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (open && focusedIndex >= 0) {
            handleSelect(options[focusedIndex].value);
          } else {
            setOpen(true);
            setFocusedIndex(options.findIndex((o) => o.value === value));
          }
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
        case "ArrowDown":
          e.preventDefault();
          if (!open) {
            setOpen(true);
            setFocusedIndex(options.findIndex((o) => o.value === value));
          } else {
            setFocusedIndex((i) => Math.min(i + 1, options.length - 1));
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (open) {
            setFocusedIndex((i) => Math.max(i - 1, 0));
          }
          break;
      }
    },
    [disabled, open, focusedIndex, options, value, handleSelect, close]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (!containerRef.current?.contains(e.relatedTarget as Node)) {
        close();
      }
    },
    [close]
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width }}
      onBlur={handleBlur}
    >
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && focusedIndex >= 0 ? `${idRef.current}-opt-${focusedIndex}` : undefined}
        className={`
          flex items-center gap-1.5 w-full
          bg-bg-primary border border-border rounded px-2.5 py-1.5
          text-[11px] font-mono text-text-secondary
          transition-colors cursor-pointer
          hover:border-text-secondary/20 hover:text-text-primary
          focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border
        `}
      >
        {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
        <span className="truncate flex-1 text-left">{selectedOption?.label ?? value}</span>
        <ChevronDown
          size={10}
          className={`shrink-0 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            onMouseDown={(e) => e.preventDefault()}
            className="absolute top-full left-0 right-0 mt-1 z-50 bg-bg-panel border border-border rounded overflow-hidden py-1 min-w-[160px]"
          >
            {options.map((option, i) => {
              const isSelected = option.value === value;
              const isFocused = i === focusedIndex;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  id={`${idRef.current}-opt-${i}`}
                  aria-selected={isSelected}
                  onMouseEnter={() => setFocusedIndex(i)}
                  onClick={() => handleSelect(option.value)}
                  className={`
                    flex items-center gap-2 w-full px-2.5 py-1.5 text-left text-[11px] font-mono
                    transition-colors
                    ${isFocused ? "bg-accent/10 text-text-primary" : "text-text-secondary hover:text-text-primary"}
                    ${isSelected ? "text-accent" : ""}
                  `}
                >
                  {option.icon && <span className="shrink-0" aria-hidden="true">{option.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{option.label}</div>
                    {option.description && (
                      <div className="text-[9px] text-text-secondary truncate">{option.description}</div>
                    )}
                  </div>
                  {isSelected && <Check size={12} className="shrink-0 text-accent" aria-hidden="true" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
