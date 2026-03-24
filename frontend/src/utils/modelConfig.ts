// --- Thinking levels ---

export type ThinkingLevel = "off" | "low" | "medium" | "high" | "max";

export interface ModelConfig {
  id: string;
  provider: "openai" | "anthropic" | "google";
  displayName: string;
  thinkingLevels: ThinkingLevel[];
  defaultThinking: ThinkingLevel;
}

export const SUPPORTED_MODELS: ModelConfig[] = [
  { id: "openai/gpt-5.4-mini",                provider: "openai",    displayName: "GPT-5.4 Mini",              thinkingLevels: ["off", "low", "medium", "high", "max"], defaultThinking: "off" },
  { id: "openai/gpt-5.4-nano",                provider: "openai",    displayName: "GPT-5.4 Nano",              thinkingLevels: ["off", "low", "medium", "high", "max"], defaultThinking: "off" },
  { id: "openai/gpt-5.4",                     provider: "openai",    displayName: "GPT-5.4",                   thinkingLevels: ["off", "low", "medium", "high", "max"], defaultThinking: "off" },
  { id: "anthropic/claude-opus-4-6",           provider: "anthropic", displayName: "Claude Opus 4.6",           thinkingLevels: ["off", "low", "medium", "high", "max"], defaultThinking: "off" },
  { id: "anthropic/claude-sonnet-4-6",         provider: "anthropic", displayName: "Claude Sonnet 4.6",         thinkingLevels: ["off", "low", "medium", "high"],        defaultThinking: "off" },
  { id: "google/gemini-3.1-pro-preview",       provider: "google",    displayName: "Gemini 3.1 Pro",            thinkingLevels: ["off", "low", "medium", "high"],        defaultThinking: "off" },
  { id: "google/gemini-3-flash-preview",       provider: "google",    displayName: "Gemini 3 Flash",            thinkingLevels: ["off", "low", "medium", "high"],        defaultThinking: "off" },
  { id: "google/gemini-3.1-flash-lite-preview",provider: "google",    displayName: "Gemini 3.1 Flash Lite",     thinkingLevels: ["off", "low", "medium", "high"],        defaultThinking: "off" },
];

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return SUPPORTED_MODELS.find((m) => m.id === modelId);
}
