"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthProvider";
import { glowApi, message } from "@/lib/glow-api";
import {
  asCity,
  emptyCity,
  type City,
  type Environment,
  type Location,
  type Plan,
  type PlanRecord,
  type Product,
  type Profile,
  type Scan,
} from "@/lib/domain";

export type { Profile } from "@/lib/domain";
export const defaultProfile: Profile = {
  city: null,
  recentCities: [],
  concerns: [],
  avoid: [],
  owned: [],
  budgetMode: "routine",
  budgetMin: 0,
  budgetMax: null,
  skinTypeOverride: null,
  units: "C",
  notifications: { uv: true, scan: true, price: true, trip: true },
  keepScanHistory: true,
  scanConsent: false,
  onboarding: null,
  planOutdated: false,
};
const emptyPlan: Plan = { morning: [], evening: [] };
type AppState = {
  city: City;
  recentCityIds: string[];
  cities: City[];
  cityById: (id: string) => City;
  setCity: (city: string | Location) => Promise<boolean>;
  plan: Plan;
  planRecord: PlanRecord | null;
  setPlan: (plan: Plan) => Promise<boolean>;
  adoptPlan: (plan: PlanRecord) => void;
  addToPlan: (
    productId: string,
    category: string,
    when: "morning" | "evening" | "both",
  ) => Promise<boolean>;
  planOutdated: boolean;
  setPlanOutdated: (value: boolean) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => Promise<boolean | null>;
  compare: string[];
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  reload: () => Promise<void>;
  latestScan: Scan | null;
  scanHistory: Scan[];
  acceptScan: (scan: Scan) => void;
  forgetScan: (id: string) => void;
  environment: Environment | null;
  environmentError: string | null;
  products: Product[];
  productById: (id: string) => Product | undefined;
  mergeProducts: (items: Product[]) => void;
  savedPlans: PlanRecord[];
  refreshPlans: () => Promise<void>;
};
const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const [profile, setProfile] = useState(defaultProfile);
  const [planRecord, setPlanRecord] = useState<PlanRecord | null>(null);
  const [planOutdated, setPlanOutdated] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [latestScan, setLatestScan] = useState<Scan | null>(null);
  const [scanHistory, setScanHistory] = useState<Scan[]>([]);
  const [savedPlans, setSavedPlans] = useState<PlanRecord[]>([]);
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const writes = useRef(Promise.resolve());
  const mergeProducts = useCallback(
    (items: Product[]) =>
      setCatalog((current) => {
        const map = new Map(current.map((p) => [p.id, p]));
        items.forEach((p) => map.set(p.id, p));
        return [...map.values()];
      }),
    [],
  );
  const adoptPlan = useCallback(
    (plan: PlanRecord) => {
      setPlanRecord(plan);
      mergeProducts(plan.products);
      setPlanOutdated(false);
    },
    [mergeProducts],
  );
  const reload = useCallback(async () => {
    const run = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const [dashboard, history, products, plans] = await Promise.all([
        glowApi.dashboard(),
        glowApi.scans(),
        glowApi.products(),
        glowApi.plans(),
      ]);
      if (run !== generation.current) return;
      setProfile(dashboard.profile);
      setLatestScan(dashboard.scan);
      setPlanRecord(dashboard.plan);
      setPlanOutdated(dashboard.planOutdated);
      setWishlist(dashboard.wishlist);
      setEnvironment(dashboard.environment);
      setEnvironmentError(dashboard.environmentError);
      setScanHistory(history.scans);
      setSavedPlans(plans.plans);
      mergeProducts([
        ...products.products,
        ...(dashboard.plan?.products ?? []),
        ...plans.plans.flatMap((p) => p.products),
      ]);
      const missing = dashboard.wishlist.filter(
        (id) => !products.products.some((p) => p.id === id),
      );
      const saved = await Promise.all(missing.map((id) => glowApi.product(id)));
      if (run === generation.current) mergeProducts(saved);
    } catch (err) {
      if (run === generation.current) setError(message(err));
    } finally {
      if (run === generation.current) setLoading(false);
    }
  }, [mergeProducts]);
  useEffect(() => {
    setCatalog([]);
    setProfile(defaultProfile);
    setPlanRecord(null);
    setLatestScan(null);
    setWishlist([]);
    setCompare([]);
    if (status === "authenticated") void reload();
    else {
      generation.current++;
      setLoading(false);
    }
  }, [user?.id, status, reload]);
  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    try {
      const next = await glowApi.profile(patch);
      setProfile(next);
      setPlanOutdated(next.planOutdated);
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    }
  }, []);
  const cities = useMemo(
    () =>
      profile.recentCities.map((c) =>
        environment?.city.id === c.id ? environment.city : asCity(c),
      ),
    [profile.recentCities, environment],
  );
  const cityById = useCallback(
    (id: string) => cities.find((c) => c.id === id) ?? emptyCity,
    [cities],
  );
  const setCity = useCallback(
    async (value: string | Location) => {
      const location =
        typeof value === "string" ? cities.find((c) => c.id === value) : value;
      if (!location || !(await updateProfile({ city: location }))) return false;
      setEnvironment(null);
      await reload();
      return true;
    },
    [cities, updateProfile, reload],
  );
  const setPlan = useCallback(
    (plan: Plan) => {
      if (!planRecord) {
        setError("Build a plan from your report first.");
        return Promise.resolve(false);
      }
      const original = planRecord;
      const result = writes.current.then(async () => {
        try {
          adoptPlan(await glowApi.updatePlan(original.id, { routine: plan }));
          return true;
        } catch (err) {
          setError(message(err));
          return false;
        }
      });
      writes.current = result.then(() => undefined);
      return result;
    },
    [planRecord, adoptPlan],
  );
  const addToPlan = useCallback(
    (
      productId: string,
      category: string,
      when: "morning" | "evening" | "both",
    ) => {
      const routine = planRecord ?? emptyPlan;
      const put = (steps: Plan["morning"], time: string) => {
        const step = {
          id: `${time}-${Date.now()}`,
          productId,
          category,
          reason: "Added by you",
          edited: true,
        };
        return steps.some((s) => s.category === category)
          ? steps.map((s) =>
              s.category === category ? { ...step, id: s.id } : s,
            )
          : [...steps, step];
      };
      return setPlan({
        morning:
          when === "evening" ? routine.morning : put(routine.morning, "m"),
        evening:
          when === "morning" ? routine.evening : put(routine.evening, "e"),
      });
    },
    [planRecord, setPlan],
  );
  const toggleWishlist = useCallback(
    async (id: string) => {
      const added = !wishlist.includes(id);
      try {
        await glowApi.wishlist(id, added);
        setWishlist((w) =>
          added ? [...new Set([...w, id])] : w.filter((i) => i !== id),
        );
        return added;
      } catch (err) {
        setError(message(err));
        return null;
      }
    },
    [wishlist],
  );
  const refreshPlans = useCallback(async () => {
    try {
      setSavedPlans((await glowApi.plans()).plans);
    } catch (err) {
      setError(message(err));
    }
  }, []);
  const value: AppState = {
    city:
      environment?.city ?? (profile.city ? asCity(profile.city) : emptyCity),
    recentCityIds: profile.recentCities.map((c) => c.id),
    cities,
    cityById,
    setCity,
    plan: planRecord ?? emptyPlan,
    planRecord,
    setPlan,
    adoptPlan,
    addToPlan,
    planOutdated,
    setPlanOutdated,
    wishlist,
    toggleWishlist,
    compare,
    toggleCompare: (id) =>
      setCompare((c) =>
        c.includes(id)
          ? c.filter((i) => i !== id)
          : c.length < 3
            ? [...c, id]
            : c,
      ),
    clearCompare: () => setCompare([]),
    profile,
    updateProfile,
    loading,
    error,
    clearError: () => setError(null),
    reload,
    latestScan,
    scanHistory,
    acceptScan: (scan) => {
      setLatestScan(scan);
      if (profile.keepScanHistory)
        setScanHistory((s) => [...s.filter((x) => x.id !== scan.id), scan]);
    },
    forgetScan: (id) => {
      setLatestScan((scan) => (scan?.id === id ? null : scan));
    },
    environment,
    environmentError,
    products: catalog,
    productById: (id) => catalog.find((p) => p.id === id),
    mergeProducts,
    savedPlans,
    refreshPlans,
  };
  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}
export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value)
    throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}
