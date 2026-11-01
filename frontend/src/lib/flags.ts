"use client";
import { useAppState } from "@/components/providers/AppStateProvider";
export function useHasScan(): boolean | null {
  const { loading, latestScan } = useAppState();
  return loading ? null : latestScan !== null;
}
export function useOnboardingState() {
  const { loading, profile } = useAppState();
  return loading ? undefined : profile.onboarding;
}
