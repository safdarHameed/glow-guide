import { AI_ATTENTION_CODES, emitAiAttention, emitAiChanged, usesAi } from "./ai-events";

/** Error shape returned by the GlowGuide API: {"error": {"code", "message", "fields"?}}. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True when the API couldn't be reached at all (offline, server down, proxy error). */
  get isUnreachable() {
    return this.status === 0 || this.status >= 500;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Retry once after refreshing the session when the access token has expired. */
  refreshOnUnauthorized?: boolean;
};

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time: concurrent 401s share the same in-flight rotation. */
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, refreshOnUnauthorized = true } = options;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "We can't reach GlowGuide right now. Check your connection and try again.");
  }

  if (response.status === 401 && refreshOnUnauthorized && (await refreshSession())) {
    return api<T>(path, { ...options, refreshOnUnauthorized: false });
  }

  if (usesAi(method, path)) emitAiChanged();
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error;
    // The AI settings form shows its own errors; the dialog is for AI failures elsewhere in the app.
    if (error?.code && AI_ATTENTION_CODES.has(error.code) && !path.startsWith("/ai/")) {
      emitAiAttention({ code: error.code, message: error.message });
    }
    throw new ApiError(
      response.status,
      error?.code ?? "HTTP_ERROR",
      error?.message ??
        (response.status >= 500
          ? "GlowGuide is having trouble right now. Please try again in a moment."
          : "Something went wrong. Please try again."),
      error?.fields,
    );
  }
  return data as T;
}
