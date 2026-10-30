import { api } from "./api";

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  googleLinked: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
};

type AuthResponse = { user: User; isNewUser: boolean };
type Message = { message: string };
export type Providers = { google: { enabled: boolean; clientId: string | null } };

// Credential calls never trigger a silent refresh: a 401 there means "wrong password", not "expired".
const noRefresh = { refreshOnUnauthorized: false } as const;

export const authApi = {
  providers: () => api<Providers>("/auth/providers", noRefresh),
  signup: (body: { name: string; email: string; password: string }) =>
    api<AuthResponse>("/auth/signup", { method: "POST", body, ...noRefresh }),
  login: (body: { email: string; password: string }) =>
    api<AuthResponse>("/auth/login", { method: "POST", body, ...noRefresh }),
  google: (code: string) => api<AuthResponse>("/auth/google", { method: "POST", body: { code }, ...noRefresh }),
  me: () => api<{ user: User }>("/auth/me"),
  logout: () => api<void>("/auth/logout", { method: "POST", ...noRefresh }),
  forgotPassword: (email: string) =>
    api<Message>("/auth/forgot-password", { method: "POST", body: { email }, ...noRefresh }),
  resetPassword: (token: string, password: string) =>
    api<Message>("/auth/reset-password", { method: "POST", body: { token, password }, ...noRefresh }),
};

/** Drops the routing hint so middleware stops treating this browser as signed in. */
export function clearSessionHint() {
  document.cookie = "gg_session=; Max-Age=0; path=/; SameSite=Lax";
}

/** Only allow in-app relative redirects after login (no open redirects). */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?"
  );
}
