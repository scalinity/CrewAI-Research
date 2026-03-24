import type { AgentStatus, CrewStatus } from "@/types/events";

type Status = AgentStatus | CrewStatus;

const STATUS_STYLES: Record<string, string> = {
  idle: "bg-text-muted/20 text-text-muted",
  thinking: "bg-accent-blue/20 text-accent-blue",
  tool_call: "bg-accent-amber/20 text-accent-amber",
  done: "bg-accent-emerald/20 text-accent-emerald",
  complete: "bg-accent-emerald/20 text-accent-emerald",
  error: "bg-accent-rose/20 text-accent-rose",
  running: "bg-accent-blue/20 text-accent-blue",
};

const STATUS_LABELS: Record<string, string> = {
  idle: "Idle",
  thinking: "Thinking",
  tool_call: "Tool Call",
  done: "Done",
  complete: "Complete",
  error: "Error",
  running: "Running",
};

export function StatusBadge({ status }: { status: Status }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.idle;
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      role="status"
      aria-label={`Status: ${label}`}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${style}`}
    >
      {label}
    </span>
  );
}
