import { useState, useMemo } from "react";
import { Loader2, Play, Brain, Cpu } from "lucide-react";
import type { CrewStatus } from "@/types/events";
import { SUPPORTED_MODELS, getModelConfig, type ThinkingLevel } from "@/utils/modelConfig";
import { CustomSelect, type SelectOption } from "@/components/shared/CustomSelect";
import { TopicInput } from "./TopicInput";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
};

const THINKING_LABELS: Record<string, string> = {
  off: "No thinking",
  low: "Low",
  medium: "Medium",
  high: "High",
  max: "Maximum",
};

export function RunControls({
  crewStatus,
  onStartRun,
  onCancelRun,
}: {
  crewStatus: CrewStatus;
  onStartRun: (topic: string, model: string, thinkingLevel: string) => void;
  onCancelRun: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [selectedModel, setSelectedModel] = useState(SUPPORTED_MODELS[0].id);
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>("off");

  const isRunning = crewStatus === "running";
  const modelConfig = getModelConfig(selectedModel);
  const availableLevels = modelConfig?.thinkingLevels ?? ["off"];

  const modelOptions: SelectOption[] = useMemo(
    () =>
      SUPPORTED_MODELS.map((m) => ({
        value: m.id,
        label: m.displayName,
        description: PROVIDER_LABELS[m.provider] ?? m.provider,
      })),
    []
  );

  const thinkingOptions: SelectOption[] = useMemo(
    () =>
      availableLevels.map((level) => ({
        value: level,
        label: THINKING_LABELS[level] ?? level,
      })),
    [availableLevels]
  );

  const handleSubmit = () => {
    if (!topic.trim() || isRunning) return;
    onStartRun(topic.trim(), selectedModel, thinkingLevel);
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    const newConfig = getModelConfig(modelId);
    if (newConfig && !newConfig.thinkingLevels.includes(thinkingLevel)) {
      setThinkingLevel(newConfig.defaultThinking);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-1 max-w-2xl">
      <TopicInput value={topic} onChange={setTopic} disabled={isRunning} />

      <CustomSelect
        value={selectedModel}
        options={modelOptions}
        onChange={handleModelChange}
        disabled={isRunning}
        ariaLabel="Select AI model"
        icon={<Cpu size={11} className="text-accent-blue/60" />}
        width="160px"
      />

      {availableLevels.length > 1 && (
        <CustomSelect
          value={thinkingLevel}
          options={thinkingOptions}
          onChange={(v) => setThinkingLevel(v as ThinkingLevel)}
          disabled={isRunning}
          ariaLabel="Thinking level"
          icon={<Brain size={11} className="text-accent-purple/60" />}
          width="130px"
        />
      )}

      {isRunning ? (
        <button
          onClick={onCancelRun}
          aria-label="Cancel running crew"
          className="flex items-center gap-1.5 bg-accent-rose/20 text-accent-rose rounded-lg px-3 py-1.5 text-[12px] font-display font-medium hover:bg-accent-rose/30 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-accent-rose focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary"
        >
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          Cancel
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!topic.trim()}
          aria-label="Start crew run"
          className="flex items-center gap-1.5 bg-accent-blue rounded-lg px-3 py-1.5 text-[12px] font-display font-medium text-bg-primary hover:bg-accent-blue/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary"
        >
          <Play size={14} aria-hidden="true" />
          Run Crew
        </button>
      )}
    </div>
  );
}
