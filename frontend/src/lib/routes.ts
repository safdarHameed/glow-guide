// Central route map so landing CTAs match the blueprint's auth flow (S01 → S02 → S03 → S05).
export const routes = {
  home: "/",
  signup: "/auth?mode=signup",
  login: "/auth?mode=login",
  // "Start free scan" needs an account; the intent flag sends the user to the camera after onboarding.
  startScan: "/auth?mode=signup&intent=scan",
  sampleReport: "/report/demo",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export function scoreTone(score: number) {
  if (score >= 70) return { text: "text-brand-500", bg: "bg-brand-500", soft: "bg-brand-50", stroke: "#24695C" };
  if (score >= 50) return { text: "text-sun-600", bg: "bg-sun-500", soft: "bg-sun-50", stroke: "#D9822F" };
  return { text: "text-rose-500", bg: "bg-rose-500", soft: "bg-rose-50", stroke: "#C4504B" };
}
