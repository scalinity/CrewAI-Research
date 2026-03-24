import { useReducer } from "react";
import type {
  AgentState,
  CrewEvent,
  CrewStatus,
  MetricsState,
  TaskState,
  ThoughtEntryData,
  ToolCallState,
} from "@/types/events";

const MAX_THOUGHTS = 500;
const MAX_TOOL_CALLS = 100;

export interface CrewState {
  crewStatus: CrewStatus;
  runId: string | null;
  topic: string;
  agents: AgentState[];
  tasks: TaskState[];
  metrics: MetricsState;
  tokenTimeSeries: { time: number; tokens: number }[];
  toolCalls: ToolCallState[];
  thoughts: ThoughtEntryData[];
  finalOutput: string;
  nextThoughtId: number;
}

const initialState: CrewState = {
  crewStatus: "idle",
  runId: null,
  topic: "",
  agents: [],
  tasks: [],
  metrics: { totalTokens: 0, estimatedCost: 0, startTime: null, durationMs: 0 },
  tokenTimeSeries: [],
  toolCalls: [],
  thoughts: [],
  finalOutput: "",
  nextThoughtId: 1,
};

type Action = { type: "CREW_EVENT"; event: CrewEvent } | { type: "RESET" };

const TASK_LABELS = ["Research", "Write", "Review"];

// Derive thought IDs from a monotonic counter in state to keep the reducer pure.
// Using thoughts.length would cause ID collisions after addThought trims old entries.
function nextId(state: CrewState): string {
  return String(state.nextThoughtId);
}

function crewReducer(state: CrewState, action: Action): CrewState {
  if (action.type === "RESET") {
    return initialState;
  }

  const event = action.event;

  switch (event.type) {
    case "crew_start":
      return {
        ...initialState,
        crewStatus: "running",
        runId: event.run_id,
        topic: event.topic,
        agents: event.agent_names.map((name) => ({
          name,
          role: name,
          status: "idle",
          lastThought: "",
          currentTool: null,
          tokensUsed: 0,
        })),
        tasks: TASK_LABELS.slice(0, event.agent_names.length).map((label, i) => ({
          description: label,
          agent: event.agent_names[i],
          status: "pending" as const,
          output: "",
          duration_ms: 0,
        })),
        metrics: { totalTokens: 0, estimatedCost: 0, startTime: Date.now(), durationMs: 0 },
      };

    case "agent_start":
      return {
        ...state,
        nextThoughtId: state.nextThoughtId + 1,
        agents: state.agents.map((a) =>
          a.name === event.agent_name ? { ...a, status: "thinking" } : a
        ),
        tasks: state.tasks.map((t) =>
          t.agent === event.agent_name && t.status === "pending" ? { ...t, status: "active" } : t
        ),
        thoughts: addThought(state.thoughts, {
          id: nextId(state),
          type: "agent_start",
          agent_name: event.agent_name,
          content: `${event.agent_name} started: ${event.task_description}`,
          timestamp: event.timestamp,
        }),
      };

    case "thought":
      return {
        ...state,
        nextThoughtId: state.nextThoughtId + 1,
        agents: state.agents.map((a) =>
          a.name === event.agent_name
            ? { ...a, status: "thinking", lastThought: event.thought, currentTool: null }
            : a
        ),
        thoughts: addThought(state.thoughts, {
          id: nextId(state),
          type: "thought",
          agent_name: event.agent_name,
          content: event.thought,
          timestamp: event.timestamp,
        }),
      };

    case "tool_call": {
      const tcId = nextId(state);
      return {
        ...state,
        nextThoughtId: state.nextThoughtId + 1,
        agents: state.agents.map((a) =>
          a.name === event.agent_name
            ? { ...a, status: "tool_call", currentTool: event.tool_name }
            : a
        ),
        toolCalls: addToolCall(state.toolCalls, {
            id: tcId,
            name: event.tool_name,
            agent: event.agent_name,
            input: event.tool_input,
            output: "",
            latency_ms: 0,
            status: "pending",
            timestamp: event.timestamp,
          }),
        thoughts: addThought(state.thoughts, {
          id: tcId,
          type: "tool_call",
          agent_name: event.agent_name,
          content: `Calling ${event.tool_name}`,
          tool_name: event.tool_name,
          tool_input: event.tool_input,
          timestamp: event.timestamp,
        }),
      };
    }

    case "tool_result":
      return {
        ...state,
        nextThoughtId: state.nextThoughtId + 1,
        agents: state.agents.map((a) =>
          a.name === event.agent_name
            ? { ...a, status: "thinking", currentTool: null }
            : a
        ),
        toolCalls: updateFirstPendingToolCall(state.toolCalls, event),
        thoughts: addThought(state.thoughts, {
          id: nextId(state),
          type: "tool_result",
          agent_name: event.agent_name,
          content: event.result_preview,
          tool_name: event.tool_name,
          tool_output: event.result_preview,
          latency_ms: event.duration_ms,
          timestamp: event.timestamp,
        }),
      };

    case "task_complete":
      return {
        ...state,
        nextThoughtId: state.nextThoughtId + 1,
        agents: state.agents.map((a) =>
          a.name === event.agent_name ? { ...a, status: "done", currentTool: null } : a
        ),
        tasks: state.tasks.map((t) =>
          t.agent === event.agent_name && (t.status === "active" || t.status === "pending")
            ? { ...t, status: "done", output: event.output_preview, duration_ms: event.duration_ms }
            : t
        ),
        thoughts: addThought(state.thoughts, {
          id: nextId(state),
          type: "task_complete",
          agent_name: event.agent_name,
          content: event.output_preview,
          timestamp: event.timestamp,
        }),
      };

    case "token_usage": {
      // Cap tokenTimeSeries at 200 points to bound memory and Recharts rendering cost.
      // Downsample by skipping points when the array is large and the delta is small.
      const MAX_SERIES = 200;
      let nextSeries = state.tokenTimeSeries;
      const tokenDelta = event.cumulative_total - state.metrics.totalTokens;
      const shouldSample =
        state.tokenTimeSeries.length < MAX_SERIES ||
        tokenDelta > state.metrics.totalTokens * 0.02 || // >2% change
        state.tokenTimeSeries.length === 0;

      if (shouldSample) {
        nextSeries =
          state.tokenTimeSeries.length >= MAX_SERIES
            ? state.tokenTimeSeries.slice(-(MAX_SERIES - 1)).concat({ time: event.timestamp, tokens: event.cumulative_total })
            : state.tokenTimeSeries.concat({ time: event.timestamp, tokens: event.cumulative_total });
      }

      return {
        ...state,
        metrics: {
          ...state.metrics,
          totalTokens: event.cumulative_total,
          estimatedCost: event.estimated_cost_usd,
        },
        tokenTimeSeries: nextSeries,
        agents: state.agents.map((a) =>
          a.name === event.agent_name
            ? { ...a, tokensUsed: (a.tokensUsed || 0) + Math.max(tokenDelta, 0) }
            : a
        ),
      };
    }

    case "crew_complete":
      return {
        ...state,
        crewStatus: "complete",
        finalOutput: event.final_output,
        metrics: {
          ...state.metrics,
          totalTokens: event.total_tokens,
          estimatedCost: event.total_cost_usd,
          durationMs: event.total_duration_ms,
        },
      };

    case "delegation":
      return {
        ...state,
        nextThoughtId: state.nextThoughtId + 1,
        thoughts: addThought(state.thoughts, {
          id: nextId(state),
          type: "delegation",
          agent_name: event.from_agent,
          content: `Delegated to ${event.to_agent}: ${event.reason}`,
          timestamp: event.timestamp,
        }),
      };

    case "error":
      return {
        ...state,
        crewStatus: "error",
        nextThoughtId: state.nextThoughtId + 1,
        thoughts: addThought(state.thoughts, {
          id: nextId(state),
          type: "error",
          agent_name: event.agent_name || "System",
          content: event.error_message,
          timestamp: event.timestamp,
        }),
      };

    case "run_state_snapshot":
      return {
        ...state,
        crewStatus: event.status as CrewStatus,
        runId: event.run_id,
        topic: event.topic,
        agents: event.agents.map((a) => ({
          name: a.name,
          role: a.name,
          status: (a.status as AgentState["status"]) || "idle",
          lastThought: "",
          currentTool: null,
          tokensUsed: 0,
        })),
        tasks: event.tasks.map((t) => ({
          description: t.description,
          agent: t.agent,
          status: (t.status as TaskState["status"]) || "pending",
          output: "",
          duration_ms: 0,
        })),
        metrics: {
          totalTokens: event.metrics.totalTokens ?? 0,
          estimatedCost: event.metrics.estimatedCost ?? 0,
          startTime: Date.now(),
          durationMs: 0,
        },
      };

    default:
      return state;
  }
}

/** Update only the FIRST pending tool call matching agent+tool, not all of them. */
function updateFirstPendingToolCall(
  toolCalls: ToolCallState[],
  event: { agent_name: string; tool_name: string; result_preview: string; duration_ms: number },
): ToolCallState[] {
  let matched = false;
  return toolCalls.map((tc) => {
    if (!matched && tc.agent === event.agent_name && tc.name === event.tool_name && tc.status === "pending") {
      matched = true;
      return { ...tc, output: event.result_preview, latency_ms: event.duration_ms, status: "success" as const };
    }
    return tc;
  });
}

function addThought(thoughts: ThoughtEntryData[], entry: ThoughtEntryData): ThoughtEntryData[] {
  if (thoughts.length >= MAX_THOUGHTS) {
    // Drop the oldest 50 entries in bulk to avoid trimming on every single event
    const BULK_DROP = 50;
    const trimmed = thoughts.slice(-(MAX_THOUGHTS - BULK_DROP - 1));
    trimmed.push(entry);
    return trimmed;
  }
  return thoughts.concat(entry);
}

function addToolCall(toolCalls: ToolCallState[], entry: ToolCallState): ToolCallState[] {
  if (toolCalls.length >= MAX_TOOL_CALLS) {
    const trimmed = toolCalls.slice(-(MAX_TOOL_CALLS - 10));
    trimmed.push(entry);
    return trimmed;
  }
  return toolCalls.concat(entry);
}

export function useCrewState() {
  return useReducer(crewReducer, initialState);
}
