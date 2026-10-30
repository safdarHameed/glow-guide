"use client";

import { useEffect, useState } from "react";

/**
 * Per-browser progress flags until scans and profiles are stored by the API.
 * - gg_has_scan: set once the first scan finishes; unlocks report and plan screens.
 * - gg_onboarding: "done" or "skipped"; "skipped" shows a "finish your profile" banner.
 */

const HAS_SCAN = "gg_has_scan";
const ONBOARDING = "gg_onboarding";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export const setHasScan = (value: boolean) => write(HAS_SCAN, value ? "1" : null);
export const setOnboardingState = (value: "done" | "skipped") => write(ONBOARDING, value);

/** `null` until read on the client, so screens can render a skeleton instead of flashing the wrong state. */
export function useHasScan(): boolean | null {
  const [value, setValue] = useState<boolean | null>(null);
  useEffect(() => setValue(read(HAS_SCAN) === "1"), []);
  return value;
}

export function useOnboardingState(): "done" | "skipped" | null | undefined {
  const [value, setValue] = useState<"done" | "skipped" | null | undefined>(undefined);
  useEffect(() => setValue(read(ONBOARDING) as "done" | "skipped" | null), []);
  return value;
}
