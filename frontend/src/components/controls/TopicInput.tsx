const PRESETS = [
  "AI in healthcare 2026",
  "Quantum computing breakthroughs",
  "Future of autonomous vehicles",
  "Climate tech innovations",
];

export function TopicInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="relative flex-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Enter a topic to research..."
        aria-label="Research topic"
        className="w-full bg-bg-primary border border-border rounded px-3 py-1.5 text-[13px] font-display text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary disabled:opacity-50 transition-colors"
        list="topic-presets"
      />
      <datalist id="topic-presets">
        {PRESETS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </div>
  );
}
