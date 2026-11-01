import type {
  City as DemoCity,
  Product as DemoProduct,
  Metric,
  Plan,
} from "./mock-data";

export type Currency = string;
export type City = Omit<DemoCity, "currency"> & {
  lat: number;
  lon: number;
  countryCode: string;
  currency: string;
};
export type Location = Omit<
  City,
  "temp" | "feelsLike" | "humidity" | "uv" | "aqi" | "pm25"
>;
export type Product = Omit<DemoProduct, "offers"> & {
  offers: (DemoProduct["offers"][number] & { currency?: string })[];
  sources?: string[];
  ingredientsConfirmed?: boolean;
  cityId?: string;
};
export type {
  Category,
  Ingredient,
  StoreOffer,
  PlanStep,
  Plan,
  Metric,
} from "./mock-data";
export type Scan = {
  id: string;
  status: "running" | "success" | "error" | "timeout" | "cancelled";
  error: string | null;
  createdAt: string;
  city: string;
  date: string;
  time: string;
  overall: number;
  change: number;
  previousDate?: string | null;
  skinType: string;
  age: number | null;
  metrics: Metric[];
  priorities: string[];
  masks: Record<string, string>;
};
export type Profile = {
  city: Location | null;
  recentCities: Location[];
  concerns: string[];
  avoid: string[];
  owned: string[];
  budgetMode: "product" | "routine";
  budgetMin: number;
  budgetMax: number | null;
  skinTypeOverride: string | null;
  units: "C" | "F";
  notifications: { uv: boolean; scan: boolean; price: boolean; trip: boolean };
  keepScanHistory: boolean;
  scanConsent: boolean;
  onboarding: "done" | "skipped" | null;
  planOutdated: boolean;
};
export type Environment = {
  city: City;
  updatedAt: string;
  source: string;
  forecast: {
    day: string;
    date: string;
    temp: number;
    uv: number;
    humidity: number;
    aqi: number | null;
    hourly: { hour: string; uv: number }[];
  }[];
  advice: {
    key: string;
    title: string;
    body: string;
    step: string;
    inPlan: boolean;
  }[];
};
export type PlanRecord = Plan & {
  budgetMode?: "product" | "routine";
  id: string;
  name: string;
  city: Location;
  scanId: string | null;
  scanDeleted: boolean;
  isCurrent: boolean;
  saved: boolean;
  createdAt: string;
  products: Product[];
  total: number;
  budget: number | null;
  overBudget: boolean;
  notes: string[];
  ownedSavings: number;
  trip: null | {
    destination: City;
    home: City;
    start: string;
    end: string;
    tripType: "beach" | "city" | "work";
    buyAt: "home" | "dest";
    label: string;
    notes: string[];
    kit: {
      kind: "keep" | "swap" | "add";
      productId: string;
      fromId?: string;
      text: string;
    }[];
  };
};
export const categories = [
  "Cleansers",
  "Serums",
  "Moisturizers",
  "Sunscreens",
  "Exfoliants",
  "Aftercare",
] as const;
export const concernOptions = [
  "Oiliness",
  "Acne and breakouts",
  "Dark spots",
  "Dryness",
  "Redness",
  "Large pores",
  "Fine lines",
];
export const commonAvoid = [
  "Fragrance",
  "Alcohol denat.",
  "Essential oils",
  "Parabens",
  "Sulfates",
];
export { uvLabel, aqiLabel } from "./mock-data";
export const formatPrice = (amount: number, currency = "PKR") =>
  `${currency} ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
export const lowestPrice = (product: Product) =>
  Math.min(...product.offers.map((o) => o.price));
export const asCity = (location: Location): City => ({
  ...location,
  temp: 0,
  feelsLike: 0,
  humidity: 0,
  uv: 0,
  aqi: null,
  pm25: null,
});
export const emptyCity: City = {
  id: "",
  name: "Choose a city",
  country: "",
  countryCode: "",
  currency: "PKR",
  lat: 0,
  lon: 0,
  stores: [],
  temp: 0,
  feelsLike: 0,
  humidity: 0,
  uv: 0,
  aqi: null,
  pm25: null,
};
export function skinAdvice(city: City, skinType: string, categories: string[]) {
  const rows = [
    {
      key: "uv",
      title: city.uv >= 6 ? "High UV" : "Daily sun protection",
      body:
        city.uv >= 6
          ? "Use SPF 50 and reapply every 2 hours outdoors."
          : "Use daily sunscreen outdoors.",
      step: "sunscreen",
    },
  ];
  if (city.aqi !== null && city.aqi >= 100)
    rows.push({
      key: "aqi",
      title: "Smog",
      body: "Double-cleanse at night to remove particles and sunscreen.",
      step: "cleanser",
    });
  if (city.humidity >= 60 && /oily|combination/i.test(skinType))
    rows.push({
      key: "humid",
      title: "Humid + oily skin",
      body: "Choose light gel textures.",
      step: "moisturizer",
    });
  if (city.humidity <= 35)
    rows.push({
      key: "dry",
      title: "Dry air",
      body: "Choose a richer moisturizer and a hydrating layer.",
      step: "moisturizer",
    });
  return rows.map((r) => ({
    ...r,
    inPlan: categories.some((c) => c.toLowerCase().includes(r.step)),
  }));
}
