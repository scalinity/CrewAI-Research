import { memo } from "react";
import type { MetricsState, AgentState, CrewStatus } from "@/types/events";
import { TokenCard } from "./TokenCard";
import { CostCard } from "./CostCard";
import { TimeCard } from "./TimeCard";
import { TokenChart } from "./TokenChart";

export const MetricsPanel = memo(function MetricsPanel({
  metrics,
  agents,
  crewStatus,
  modelName,
  tokenTimeSeries,
}: {
  metrics: MetricsState;
  agents: AgentState[];
  crewStatus: CrewStatus;
  modelName: string;
  tokenTimeSeries: { time: number; tokens: number }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <TokenCard metrics={metrics} agents={agents} />
      <CostCard metrics={metrics} modelName={modelName} />
      <TimeCard metrics={metrics} crewStatus={crewStatus} />
      <TokenChart data={tokenTimeSeries} />
    </div>
  );
});
