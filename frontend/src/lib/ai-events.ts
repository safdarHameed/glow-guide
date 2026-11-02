/**
 * Browser events that keep the AI model badge, settings and the "limit reached" dialog in sync.
 * Kept free of imports so the low-level API client can emit them.
 */

/** Error codes that need the user to act on their AI model: a limit was hit, a key was rejected, and so on. */
export const AI_ATTENTION_CODES = new Set([
  "AI_FREE_LIMIT_REACHED",
  "AI_PROVIDER_LIMIT",
  "AI_KEY_INVALID",
  "AI_MODEL_UNAVAILABLE",
  "AI_RECONNECT_REQUIRED",
  "AI_SEARCH_UNSUPPORTED",
  "AI_NOT_CONFIGURED",
]);

export const AI_ATTENTION_EVENT = "gg:ai-attention";
export const AI_CHANGED_EVENT = "gg:ai-changed";

export type AiAttention = { code: string; message: string };

/** Requests that run the AI model (and so use free requests) or change which model is active. */
const AI_PATHS = /^\/(products\/search|plan|trip|plans\/[^/]+\/duplicate|ai\/connection)(\?|$)/;

export function usesAi(method: string, path: string) {
  return method !== "GET" && AI_PATHS.test(path);
}

export function emitAiChanged() {
  window.dispatchEvent(new Event(AI_CHANGED_EVENT));
}

export function emitAiAttention(detail: AiAttention) {
  window.dispatchEvent(new CustomEvent<AiAttention>(AI_ATTENTION_EVENT, { detail }));
}
