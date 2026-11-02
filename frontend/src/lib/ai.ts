import { api } from "./api";

export type AiProviderId = "openai" | "gemini" | "xai" | "custom";

export type AiProviderInfo = {
  id: AiProviderId;
  name: string;
  webSearch: boolean;
  needsBaseUrl: boolean;
  keyUrl: string | null;
  keyPlaceholder: string;
};

export type ActiveModel = {
  tier: "free" | "own";
  provider: AiProviderId;
  providerName: string;
  model: string;
  keyHint: string | null;
  baseUrl: string | null;
  webSearch: boolean;
  needsReconnect: boolean;
};

export type AiStatus = {
  active: ActiveModel | null;
  free: { available: boolean; model: string; used: number; limit: number; remaining: number; resetsAt: string };
  providers: AiProviderInfo[];
};

export type ConnectInput = { provider: AiProviderId; model: string; apiKey?: string; baseUrl?: string };

export const aiApi = {
  status: () => api<AiStatus>("/ai/status"),
  models: (body: { provider: AiProviderId; apiKey: string; baseUrl?: string }) =>
    api<{ models: string[] }>("/ai/models", { method: "POST", body }),
  connect: (body: ConnectInput) => api<{ message: string }>("/ai/connection", { method: "PUT", body }),
  disconnect: () => api<void>("/ai/connection", { method: "DELETE" }),
};

export const AI_SETTINGS_HREF = "/settings?section=ai";

/** "gemini-2.5-flash" → "Gemini 2.5 Flash", "gpt-5-mini" → "GPT 5 Mini". */
export function modelLabel(model: string) {
  return model
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => (/^(gpt|ai)$/i.test(part) ? part.toUpperCase() : part[0]!.toUpperCase() + part.slice(1)))
    .join(" ");
}

export function resetTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
