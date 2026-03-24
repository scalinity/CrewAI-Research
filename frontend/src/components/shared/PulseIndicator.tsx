import type { AgentStatus } from "@/types/events";

const COLOR_MAP: Record<string, string> = {
  idle: "bg-text-secondary",
  thinking: "bg-accent",
  tool_call: "bg-warning",
  done: "bg-success",
  error: "bg-error",
};

const ANIM_MAP: Record<string, string> = {
  idle: "animate-pulse-slow",
  thinking: "animate-pulse-fast",
  tool_call: "animate-pulse-fast",
  done: "",
  error: "animate-pulse-fast",
};

export function PulseIndicator({ status }: { status: AgentStatus }) {
  const color = COLOR_MAP[status] ?? COLOR_MAP.idle;
  const anim = ANIM_MAP[status] ?? "";

  return <span className={`inline-block h-2 w-2 rounded-full ${color} ${anim}`} aria-hidden="true" />;
}
