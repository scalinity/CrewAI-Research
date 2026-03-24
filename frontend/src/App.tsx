import { useCallback, useRef, useState } from "react";
import { useCrewState } from "@/hooks/useCrewState";
import { useCrewSocket } from "@/hooks/useCrewSocket";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Header } from "@/components/layout/Header";
import { AgentPanel } from "@/components/agents/AgentPanel";
import { TaskPipeline } from "@/components/pipeline/TaskPipeline";
import { ThoughtStream } from "@/components/stream/ThoughtStream";
import { MetricsPanel } from "@/components/metrics/MetricsPanel";
import { ToolLog } from "@/components/tools/ToolLog";
import type { CrewEvent } from "@/types/events";

export default function App() {
  const [state, dispatch] = useCrewState();
  const [activeModel, setActiveModel] = useState("openai/gpt-5.4-mini");

  const onEvent = useCallback(
    (event: CrewEvent) => {
      dispatch({ type: "CREW_EVENT", event });
    },
    [dispatch]
  );

  const { connectionStatus, connect, startRun, cancelRun } = useCrewSocket(onEvent);

  // Connect on mount
  const didConnect = useRef(false);
  if (!didConnect.current) {
    didConnect.current = true;
    // Schedule connect after first render
    queueMicrotask(() => connect());
  }

  const handleStartRun = useCallback(
    (topic: string, model: string, thinkingLevel: string) => {
      dispatch({ type: "RESET" });
      setActiveModel(model);
      startRun(topic, model, thinkingLevel).catch((err) => {
        console.error("Failed to start run:", err);
        dispatch({
          type: "CREW_EVENT",
          event: {
            type: "error",
            timestamp: Date.now() / 1000,
            run_id: "",
            agent_name: null,
            error_message: err.message || "Failed to start run",
            error_type: "StartError",
          },
        });
      });
    },
    [dispatch, startRun]
  );

  const handleCancelRun = useCallback(() => {
    cancelRun().catch((err) => {
      console.error("Failed to cancel run:", err);
    });
  }, [cancelRun]);

  return (
    <DashboardShell
      header={
        <Header
          crewStatus={state.crewStatus}
          connectionStatus={connectionStatus}
          onStartRun={handleStartRun}
          onCancelRun={handleCancelRun}
        />
      }
      leftSidebar={<AgentPanel agents={state.agents} />}
      center={
        <>
          <TaskPipeline tasks={state.tasks} />
          <ThoughtStream thoughts={state.thoughts} finalOutput={state.finalOutput} crewStatus={state.crewStatus} />
        </>
      }
      rightSidebar={
        <>
          <MetricsPanel
            metrics={state.metrics}
            agents={state.agents}
            crewStatus={state.crewStatus}
            modelName={activeModel}
            tokenTimeSeries={state.tokenTimeSeries}
          />
          <ToolLog toolCalls={state.toolCalls} />
        </>
      }
    />
  );
}
