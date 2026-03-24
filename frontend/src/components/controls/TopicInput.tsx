import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, Wand2, Loader2 } from "lucide-react";
import { API_BASE } from "@/utils/api";

const PRESETS = [
  { label: "AI in Healthcare 2026", category: "Technology" },
  { label: "Quantum Computing Breakthroughs", category: "Technology" },
  { label: "Future of Autonomous Vehicles", category: "Technology" },
  { label: "Climate Tech Innovations", category: "Science" },
  { label: "CRISPR Gene Therapy Progress", category: "Science" },
  { label: "Nuclear Fusion Energy Timeline", category: "Science" },
  { label: "Space Colonization Roadmap", category: "Science" },
  { label: "Global Semiconductor Supply Chain", category: "Business" },
  { label: "Central Bank Digital Currencies", category: "Business" },
  { label: "Remote Work Impact on Productivity", category: "Business" },
  { label: "Neuromorphic Computing Architecture", category: "Deep Tech" },
  { label: "Post-Quantum Cryptography Standards", category: "Deep Tech" },
  { label: "Brain-Computer Interface Ethics", category: "Deep Tech" },
];

export function TopicInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [ideaText, setIdeaText] = useState("");
  const [generating, setGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value.trim()
    ? PRESETS.filter((p) => p.label.toLowerCase().includes(value.toLowerCase()))
    : PRESETS;

  const close = useCallback(() => {
    setOpen(false);
    setFocusedIndex(-1);
  }, []);

  const handleSelect = useCallback(
    (preset: string) => {
      onChange(preset);
      close();
      inputRef.current?.focus();
    },
    [onChange, close]
  );

  const handleGenerate = useCallback(async () => {
    if (!ideaText.trim() || generating) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/generate-topic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: ideaText.trim() }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      if (data.topic) {
        onChange(data.topic);
        setIdeaText("");
        close();
        inputRef.current?.focus();
      }
    } catch {
      setIdeaText("Generation failed — try again");
    } finally {
      setGenerating(false);
    }
  }, [ideaText, generating, onChange, close]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        setOpen(true);
        setFocusedIndex(0);
        return;
      }
      if (!open) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          if (focusedIndex >= 0 && focusedIndex < filtered.length) {
            e.preventDefault();
            handleSelect(filtered[focusedIndex].label);
          } else {
            close();
            onSubmit?.();
          }
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
      }
    },
    [open, focusedIndex, filtered, handleSelect, close, onSubmit]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (!containerRef.current?.contains(e.relatedTarget as Node)) {
        close();
      }
    },
    [close]
  );

  let lastCategory = "";

  return (
    <div
      ref={containerRef}
      className="relative flex-1"
      onBlur={handleBlur}
    >
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!open) setOpen(true);
            setFocusedIndex(-1);
          }}
          onFocus={() => !disabled && setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Enter a topic to research..."
          aria-label="Research topic"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={open ? "topic-listbox" : undefined}
          aria-activedescendant={open && focusedIndex >= 0 ? `topic-option-${focusedIndex}` : undefined}
          className="w-full bg-bg-primary border border-border rounded pl-3 pr-8 py-1.5 text-[13px] font-display text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary disabled:opacity-50 transition-colors"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => !disabled && setOpen(!open)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary/60 hover:text-text-secondary transition-colors"
          aria-hidden="true"
        >
          <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1 z-50 bg-bg-panel border border-border rounded overflow-hidden max-h-[340px] flex flex-col"
          >
            {/* AI topic generator */}
            <div className="p-2 border-b border-border">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Wand2 size={10} className="text-accent-purple" aria-hidden="true" />
                <span className="text-[9px] font-mono uppercase tracking-wider text-accent-purple">
                  AI Topic Generator
                </span>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleGenerate();
                    }
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      close();
                    }
                  }}
                  onFocus={(e) => e.stopPropagation()}
                  placeholder="Describe your idea..."
                  aria-label="Describe your topic idea for AI generation"
                  className="flex-1 bg-bg-primary border border-border rounded px-2 py-1 text-[11px] font-display text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-purple/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerate();
                  }}
                  disabled={!ideaText.trim() || generating}
                  aria-label={generating ? "Generating topic..." : "Generate topic from idea"}
                  className="flex items-center gap-1 bg-accent-purple/20 text-accent-purple rounded px-2 py-1 text-[10px] font-mono font-medium hover:bg-accent-purple/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  {generating ? (
                    <Loader2 size={10} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Wand2 size={10} aria-hidden="true" />
                  )}
                  <span aria-live="polite">{generating ? "Generating..." : "Generate"}</span>
                </button>
              </div>
            </div>

            {/* Preset suggestions */}
            <div id="topic-listbox" role="listbox" aria-label="Topic suggestions" onMouseDown={(e) => e.preventDefault()} className="overflow-y-auto py-1">
              {filtered.map((preset, i) => {
                const isFocused = i === focusedIndex;
                const showCategory = preset.category !== lastCategory;
                lastCategory = preset.category;

                return (
                  <div key={preset.label}>
                    {showCategory && (
                      <div className="px-2.5 pt-2 pb-1 text-[9px] font-mono uppercase tracking-wider text-text-secondary">
                        {preset.category}
                      </div>
                    )}
                    <button
                      type="button"
                      role="option"
                      id={`topic-option-${i}`}
                      aria-selected={value === preset.label}
                      onMouseEnter={() => setFocusedIndex(i)}
                      onClick={() => handleSelect(preset.label)}
                      className={`
                        flex items-center gap-2 w-full px-2.5 py-1.5 text-left text-[12px] font-display
                        transition-colors
                        ${isFocused ? "bg-accent/10 text-text-primary" : "text-text-secondary hover:text-text-primary"}
                      `}
                    >
                      <Sparkles size={10} className="shrink-0 text-accent/40" aria-hidden="true" />
                      <span className="truncate">{preset.label}</span>
                    </button>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-2.5 py-3 text-[11px] text-text-secondary text-center italic">
                  No matching presets
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
