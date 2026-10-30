"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cityById, cities, defaultPlan, defaultWishlist, type City, type Plan, type PlanStep } from "@/lib/mock-data";

/**
 * Client-side app state until the profile/plans/saved APIs exist.
 * Persisted per browser in localStorage; every read tolerates missing or blocked storage.
 */

export type Profile = {
  concerns: string[];
  avoid: string[];
  owned: string[];
  budgetMode: "product" | "routine";
  budgetMin: number;
  budgetMax: number;
  skinTypeOverride: string | null;
  units: "C" | "F";
  notifications: { uv: boolean; scan: boolean; price: boolean; trip: boolean };
  keepScanHistory: boolean;
  scanConsent: boolean;
};

export const defaultProfile: Profile = {
  concerns: ["Oiliness", "Large pores"],
  avoid: ["Fragrance", "Alcohol denat."],
  owned: ["CeraVe Foaming Cleanser"],
  budgetMode: "routine",
  budgetMin: 1000,
  budgetMax: 15000,
  skinTypeOverride: null,
  units: "C",
  notifications: { uv: true, scan: true, price: true, trip: true },
  keepScanHistory: true,
  scanConsent: false,
};

type AppState = {
  city: City;
  recentCityIds: string[];
  setCity: (id: string) => void;
  plan: Plan;
  setPlan: (plan: Plan) => void;
  addToPlan: (productId: string, category: string, when: "morning" | "evening" | "both") => void;
  /** Bumps when a city or settings change means the plan should be refreshed ("Update plan" banner). */
  planOutdated: boolean;
  setPlanOutdated: (v: boolean) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => boolean;
  compare: string[];
  toggleCompare: (productId: string) => void;
  clearCompare: () => void;
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
};

const AppStateContext = createContext<AppState | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function loadArray(key: string, fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: state stays in memory */
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [cityId, setCityId] = useState("lahore");
  const [recentCityIds, setRecent] = useState<string[]>(["lahore", "karachi", "islamabad"]);
  const [plan, setPlanState] = useState<Plan>(defaultPlan);
  const [planOutdated, setPlanOutdated] = useState(true);
  const [wishlist, setWishlist] = useState<string[]>(defaultWishlist);
  const [compare, setCompare] = useState<string[]>([]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = load("gg_state", { cityId: "lahore", recent: ["lahore", "karachi", "islamabad"] });
    if (cities.some((c) => c.id === stored.cityId)) setCityId(stored.cityId);
    setRecent(stored.recent);
    setPlanState(load("gg_plan", defaultPlan));
    setWishlist(loadArray("gg_wishlist", defaultWishlist));
    setProfile(load("gg_profile", defaultProfile));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    save("gg_state", { cityId, recent: recentCityIds });
    save("gg_plan", plan);
    save("gg_wishlist", wishlist);
    save("gg_profile", profile);
  }, [hydrated, cityId, recentCityIds, plan, wishlist, profile]);

  const setCity = useCallback((id: string) => {
    setCityId(id);
    setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 4));
  }, []);

  const addToPlan = useCallback((productId: string, category: string, when: "morning" | "evening" | "both") => {
    setPlanState((p) => {
      const put = (steps: PlanStep[], prefix: string): PlanStep[] => {
        const step: PlanStep = { id: `${prefix}${Date.now()}`, category, productId, reason: "Added by you" };
        const i = steps.findIndex((s) => s.category === category);
        return i >= 0 ? steps.map((s, idx) => (idx === i ? { ...step, id: s.id } : s)) : [...steps, step];
      };
      return {
        morning: when === "evening" ? p.morning : put(p.morning, "m"),
        evening: when === "morning" ? p.evening : put(p.evening, "e"),
      };
    });
  }, []);

  /** Returns true when the product was added, false when removed. */
  const toggleWishlist = useCallback(
    (productId: string) => {
      const added = !wishlist.includes(productId);
      setWishlist((w) => (added ? [...w, productId] : w.filter((x) => x !== productId)));
      return added;
    },
    [wishlist],
  );

  const toggleCompare = useCallback((productId: string) => {
    setCompare((c) => (c.includes(productId) ? c.filter((x) => x !== productId) : c.length >= 3 ? c : [...c, productId]));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      city: cityById(cityId),
      recentCityIds,
      setCity,
      plan,
      setPlan: setPlanState,
      addToPlan,
      planOutdated,
      setPlanOutdated,
      wishlist,
      toggleWishlist,
      compare,
      toggleCompare,
      clearCompare: () => setCompare([]),
      profile,
      updateProfile: (patch) => setProfile((p) => ({ ...p, ...patch })),
    }),
    [cityId, recentCityIds, setCity, plan, addToPlan, planOutdated, wishlist, toggleWishlist, compare, toggleCompare, profile],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside <AppStateProvider>");
  return ctx;
}
