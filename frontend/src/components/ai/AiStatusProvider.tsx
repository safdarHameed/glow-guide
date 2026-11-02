"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AI_CHANGED_EVENT } from "@/lib/ai-events";
import { aiApi, type AiStatus } from "@/lib/ai";

type AiStatusValue = { status: AiStatus | null; reload: () => Promise<void> };

const AiStatusContext = createContext<AiStatusValue | null>(null);

/** Which model is active and how many free requests are left; refreshed after every AI request. */
export function AiStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AiStatus | null>(null);

  const reload = useCallback(async () => {
    try {
      setStatus(await aiApi.status());
    } catch {
      /* keep the last known status; the badge hides until one loads */
    }
  }, []);

  useEffect(() => {
    void reload();
    const onChange = () => void reload();
    window.addEventListener(AI_CHANGED_EVENT, onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener(AI_CHANGED_EVENT, onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [reload]);

  const value = useMemo(() => ({ status, reload }), [status, reload]);
  return <AiStatusContext.Provider value={value}>{children}</AiStatusContext.Provider>;
}

export function useAiStatus() {
  const ctx = useContext(AiStatusContext);
  if (!ctx) throw new Error("useAiStatus must be used inside <AiStatusProvider>");
  return ctx;
}
