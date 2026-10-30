"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api";
import { authApi, clearSessionHint, type User } from "@/lib/auth";

type Status = "loading" | "authenticated" | "unauthenticated" | "unreachable" | "signingOut";

type AuthContextValue = {
  user: User | null;
  status: Status;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const reload = useCallback(async () => {
    setStatus("loading");
    try {
      const { user } = await authApi.me();
      setUser(user);
      setStatus("authenticated");
    } catch (err) {
      setUser(null);
      if (err instanceof ApiError && err.isUnreachable) {
        setStatus("unreachable");
      } else {
        clearSessionHint();
        setStatus("unauthenticated");
      }
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const logout = useCallback(async () => {
    // "signingOut" keeps AppGate from bouncing to /auth while the request is in flight.
    setStatus("signingOut");
    try {
      await authApi.logout();
    } catch {
      /* cookies are cleared below either way; the server session expires on its own */
    } finally {
      clearSessionHint();
      // Full navigation drops every bit of in-memory signed-in state.
      window.location.replace("/");
    }
  }, []);

  const value = useMemo(() => ({ user, status, reload, logout }), [user, status, reload, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** For screens that only render once signed in. */
export function useUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error("useUser called before authentication finished");
  return user;
}
