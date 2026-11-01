import { api } from "./api";
import type {
  Environment,
  Location,
  Plan,
  PlanRecord,
  Product,
  Profile,
  Scan,
} from "./domain";

export type Dashboard = {
  profile: Profile;
  scan: Scan | null;
  plan: PlanRecord | null;
  environment: Environment | null;
  environmentError: string | null;
  planOutdated: boolean;
  wishlist: string[];
};
export const glowApi = {
  dashboard: () => api<Dashboard>("/dashboard"),
  profile: (patch: Partial<Profile>) =>
    api<Profile>("/profile", { method: "PATCH", body: patch }),
  cities: (q: string) =>
    api<{ cities: Location[] }>(`/cities/search?q=${encodeURIComponent(q)}`),
  reverse: (lat: number, lon: number) =>
    api<Location>(`/cities/reverse?lat=${lat}&lon=${lon}`),
  environment: (city?: Location) =>
    city
      ? api<Environment>("/environment/preview", { method: "POST", body: city })
      : api<Environment>("/environment"),
  scans: () => api<{ scans: Scan[] }>("/scans"),
  scan: (id: string) => api<Scan>(`/scan/${encodeURIComponent(id)}`),
  startScan: (photo: string) =>
    api<Scan>("/scan", { method: "POST", body: { photo } }),
  cancelScan: (id: string) =>
    api<Scan>(`/scan/${id}/cancel`, { method: "POST" }),
  viewedScan: (id: string) =>
    api<void>(`/scan/${id}/viewed`, { method: "POST" }),
  deleteScans: () =>
    api<void>("/scans", { method: "DELETE", body: { confirmation: "DELETE" } }),
  products: (cityId?: string) =>
    api<{ products: Product[] }>(
      `/products${cityId ? `?cityId=${encodeURIComponent(cityId)}` : ""}`,
    ),
  product: (id: string) => api<Product>(`/products/${encodeURIComponent(id)}`),
  search: (query: string, city?: Location) =>
    api<{ products: Product[]; updatedAt: string }>("/products/search", {
      method: "POST",
      body: { query, city },
    }),
  report: (id: string, reason: string) =>
    api(`/products/${id}/report`, { method: "POST", body: { reason } }),
  buildPlan: (
    city?: Location,
    keepChanges = true,
    scanId = "latest",
    refreshProducts = false,
  ) =>
    api<PlanRecord>("/plan", {
      method: "POST",
      body: { city, keepChanges, scanId, refreshProducts },
    }),
  plan: (id: string) => api<PlanRecord>(`/plan/${encodeURIComponent(id)}`),
  plans: () => api<{ plans: PlanRecord[] }>("/plans"),
  updatePlan: (
    id: string,
    patch: {
      name?: string;
      saved?: boolean;
      isCurrent?: boolean;
      routine?: Plan;
    },
  ) => api<PlanRecord>(`/plans/${id}`, { method: "PATCH", body: patch }),
  deletePlan: (id: string) => api<void>(`/plans/${id}`, { method: "DELETE" }),
  duplicate: (id: string, city: Location) =>
    api<PlanRecord>(`/plans/${id}/duplicate`, {
      method: "POST",
      body: { city },
    }),
  share: (id: string) =>
    api<{ url: string }>(`/plans/${id}/share`, { method: "POST" }),
  wishlist: (id: string, add: boolean) =>
    api<void>(`/saved/${id}`, { method: add ? "PUT" : "DELETE" }),
  trip: (
    destination: Location,
    start: string,
    end: string,
    tripType: "beach" | "city" | "work",
    buyAt: "home" | "dest",
  ) =>
    api<PlanRecord>("/trip", {
      method: "POST",
      body: { destination, start, end, tripType, buyAt },
    }),
  export: () => api<object>("/profile/export"),
};
export const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
