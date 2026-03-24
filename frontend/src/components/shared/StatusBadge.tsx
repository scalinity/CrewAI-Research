import type { AgentStatus, CrewStatus } from "@/types/events";

type Status = AgentStatus | CrewStatus;

const STATUS_STYLES: Record<string, string> = {
  idle: "bg-text-secondary/20 text-text-secondary",
  thinking: "bg-accent/20 text-accent",
  tool_call: "bg-warning/20 text-warning",
  done: "bg-success/20 text-success",
  complete: "bg-success/20 text-success",
  error: "bg-error/20 text-error",
  running: "bg-accent/20 text-accent",
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
