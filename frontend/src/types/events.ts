// --- Backend event types (mirrors backend/app/event_types.py) ---

export interface BaseEvent {
  type: string;
  timestamp: number;
  run_id: string;
}

export interface CrewStartEvent extends BaseEvent {
  type: "crew_start";
  agent_names: string[];
  topic: string;
}

export interface CrewCompleteEvent extends BaseEvent {
  type: "crew_complete";
  final_output: string;
  total_tokens: number;
  total_cost_usd: number;
  total_duration_ms: number;
  tasks_completed: number;
}

export interface ErrorEvent extends BaseEvent {
  type: "error";
  agent_name: string | null;
  error_message: string;
  error_type: string;
}

export interface AgentStartEvent extends BaseEvent {
  type: "agent_start";
  agent_name: string;
  agent_role: string;
  task_description: string;
}

export interface ThoughtEvent extends BaseEvent {
  type: "thought";
  agent_name: string;
  thought: string;
}

export interface ToolCallEvent extends BaseEvent {
  type: "tool_call";
  agent_name: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface ToolResultEvent extends BaseEvent {
  type: "tool_result";
  agent_name: string;
  tool_name: string;
  result_preview: string;
  duration_ms: number;
}

export interface DelegationEvent extends BaseEvent {
  type: "delegation";
  from_agent: string;
  to_agent: string;
  reason: string;
}

export interface TaskCompleteEvent extends BaseEvent {
  type: "task_complete";
  task_description: string;
  agent_name: string;
  output_preview: string;
  tokens_used: number | null;
  duration_ms: number;
}

export interface TokenUsageEvent extends BaseEvent {
  type: "token_usage";
  agent_name: string;
  input_tokens: number;
  output_tokens: number;
  cumulative_total: number;
  estimated_cost_usd: number;
}

export interface HeartbeatEvent extends BaseEvent {
  type: "heartbeat";
}

export interface RunStateSnapshot extends BaseEvent {
  type: "run_state_snapshot";
  status: string;
  agents: Array<{ name: string; status: string }>;
  tasks: Array<{ description: string; agent: string; status: string }>;
  metrics: Record<string, number>;
  recent_thoughts: Array<Record<string, string>>;
  topic: string;
}

export type CrewEvent =
  | CrewStartEvent
  | CrewCompleteEvent
  | ErrorEvent
  | AgentStartEvent
  | ThoughtEvent
  | ToolCallEvent
  | ToolResultEvent
  | DelegationEvent
  | TaskCompleteEvent
  | TokenUsageEvent
  | HeartbeatEvent
  | RunStateSnapshot;

// --- Derived state types ---

export type AgentStatus = "idle" | "thinking" | "tool_call" | "done" | "error";
export type TaskStatus = "pending" | "active" | "done" | "error";
export type CrewStatus = "idle" | "running" | "complete" | "error";
export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface AgentState {
  name: string;
  role: string;
  status: AgentStatus;
  lastThought: string;
  currentTool: string | null;
  tokensUsed: number;
}

export interface TaskState {
  description: string;
  agent: string;
  status: TaskStatus;
  output: string;
  duration_ms: number;
}

export interface MetricsState {
  totalTokens: number;
  estimatedCost: number;
  startTime: number | null;
  durationMs: number;
}

export interface ToolCallState {
  id: string;
  name: string;
  agent: string;
  input: Record<string, unknown>;
  output: string;
  latency_ms: number;
  status: "pending" | "success" | "error";
  timestamp: number;
}

export interface ThoughtEntryData {
  id: string;
  type: "thought" | "tool_call" | "tool_result" | "task_complete" | "delegation" | "error" | "agent_start";
  agent_name: string;
  content: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: string;
  latency_ms?: number;
  timestamp: number;
}
