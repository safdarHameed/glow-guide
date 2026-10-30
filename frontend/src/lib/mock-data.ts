/**
 * Sample data for the app UI until the matching backend modules exist
 * (scans, environment, products, plans, trips). Shapes mirror the blueprint's build map.
 */

export type Currency = "PKR" | "AED" | "GBP" | "EUR" | "SGD" | "TRY" | "USD";

export type City = {
  id: string;
  name: string;
  country: string;
  currency: Currency;
  temp: number;
  feelsLike: number;
  humidity: number;
  uv: number;
  /** null where the city has no air-quality data. */
  aqi: number | null;
  pm25: number | null;
  stores: string[];
};

export const cities: City[] = [
  { id: "lahore", name: "Lahore", country: "Pakistan", currency: "PKR", temp: 34, feelsLike: 37, humidity: 62, uv: 8, aqi: 152, pm25: 58, stores: ["Daraz", "Naheed", "Vegas Beauty", "Beautylish PK", "Shophive", "Brand sites"] },
  { id: "karachi", name: "Karachi", country: "Pakistan", currency: "PKR", temp: 32, feelsLike: 36, humidity: 74, uv: 9, aqi: 98, pm25: 31, stores: ["Daraz", "Naheed", "Imtiaz", "Brand sites"] },
  { id: "islamabad", name: "Islamabad", country: "Pakistan", currency: "PKR", temp: 30, feelsLike: 31, humidity: 48, uv: 7, aqi: 84, pm25: 26, stores: ["Daraz", "Naheed", "Brand sites"] },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", currency: "AED", temp: 31, feelsLike: 33, humidity: 38, uv: 10, aqi: 61, pm25: 18, stores: ["Noon", "Boots UAE", "Life Pharmacy", "Brand sites"] },
  { id: "london", name: "London", country: "United Kingdom", currency: "GBP", temp: 12, feelsLike: 10, humidity: 81, uv: 1, aqi: 28, pm25: 7, stores: ["Boots", "Superdrug", "Lookfantastic"] },
  { id: "dublin", name: "Dublin", country: "Ireland", currency: "EUR", temp: 11, feelsLike: 9, humidity: 84, uv: 1, aqi: null, pm25: null, stores: ["Boots IE", "Arnotts"] },
  { id: "dubrovnik", name: "Dubrovnik", country: "Croatia", currency: "EUR", temp: 19, feelsLike: 19, humidity: 66, uv: 4, aqi: 34, pm25: 9, stores: ["dm", "Müller"] },
  { id: "singapore", name: "Singapore", country: "Singapore", currency: "SGD", temp: 30, feelsLike: 35, humidity: 80, uv: 11, aqi: 44, pm25: 12, stores: ["Watsons", "Guardian", "Sephora SG"] },
  { id: "istanbul", name: "Istanbul", country: "Türkiye", currency: "TRY", temp: 18, feelsLike: 17, humidity: 70, uv: 4, aqi: 57, pm25: 16, stores: ["Gratis", "Watsons TR"] },
  { id: "new-york", name: "New York", country: "United States", currency: "USD", temp: 14, feelsLike: 12, humidity: 58, uv: 3, aqi: 35, pm25: 9, stores: ["Sephora", "CVS", "Ulta"] },
];

export const cityById = (id: string) => cities.find((c) => c.id === id) ?? cities[0]!;

// Rough display conversion from PKR (all sample prices are stored in PKR).
const fromPkr: Record<Currency, number> = { PKR: 1, AED: 0.0132, GBP: 0.0028, EUR: 0.0033, SGD: 0.0047, TRY: 0.12, USD: 0.0036 };

export function formatPrice(pkr: number, currency: Currency = "PKR") {
  const value = pkr * fromPkr[currency];
  const rounded = currency === "PKR" || currency === "TRY" ? Math.round(value / 10) * 10 : Math.round(value);
  return `${currency} ${rounded.toLocaleString("en-US")}`;
}

export const uvLabel = (uv: number) => (uv >= 11 ? "extreme" : uv >= 8 ? "very high" : uv >= 6 ? "high" : uv >= 3 ? "moderate" : "low");

export function aqiLabel(aqi: number | null) {
  if (aqi === null) return { label: "not available", tone: "neutral" as const };
  if (aqi >= 150) return { label: "unhealthy", tone: "rose" as const };
  if (aqi >= 100) return { label: "unhealthy for sensitive", tone: "sun" as const };
  if (aqi >= 50) return { label: "moderate", tone: "sun" as const };
  return { label: "good", tone: "brand" as const };
}

/** Rule-based advice (blueprint S07): not AI. */
export function skinAdvice(city: City) {
  const advice: { key: string; title: string; body: string; inPlan: boolean; step?: string }[] = [];
  if (city.uv >= 6) advice.push({ key: "uv", title: "High UV", body: "Use SPF 50 and reapply every 2 hours outdoors.", inPlan: true, step: "sunscreen" });
  else advice.push({ key: "uv", title: "Low UV", body: "An everyday SPF 30 is enough today.", inPlan: true, step: "sunscreen" });
  if (city.aqi !== null && city.aqi >= 100) advice.push({ key: "aqi", title: "Smog", body: "Double-cleanse at night to remove particles and sunscreen.", inPlan: true, step: "cleanser" });
  if (city.humidity >= 60) advice.push({ key: "humid", title: "Humid + oily skin", body: "Light gel textures instead of heavy creams.", inPlan: true, step: "moisturizer" });
  if (city.humidity <= 40) advice.push({ key: "dry", title: "Dry air", body: "Switch to a richer moisturizer and add a hydrating layer.", inPlan: false, step: "moisturizer" });
  return advice;
}

export const uvHourly = [
  { hour: "6", uv: 0 }, { hour: "7", uv: 1 }, { hour: "8", uv: 2 }, { hour: "9", uv: 4 }, { hour: "10", uv: 6 },
  { hour: "11", uv: 7 }, { hour: "12", uv: 8 }, { hour: "1", uv: 8 }, { hour: "2", uv: 8 }, { hour: "3", uv: 6 },
  { hour: "4", uv: 4 }, { hour: "5", uv: 2 }, { hour: "6", uv: 1 }, { hour: "7", uv: 0 },
];

export const forecast = [
  { day: "Today", temp: 34, uv: 8, aqi: 152, humidity: 62 },
  { day: "Thu", temp: 33, uv: 8, aqi: 140, humidity: 60 },
  { day: "Fri", temp: 31, uv: 7, aqi: 118, humidity: 58 },
  { day: "Sat", temp: 29, uv: 6, aqi: 96, humidity: 55 },
  { day: "Sun", temp: 30, uv: 7, aqi: 102, humidity: 57 },
];

// ---------------------------------------------------------------------------------------------
// Skin

export type Metric = { key: string; name: string; note: string; value: number; meaning: string; helps: string[] };

export const latestScan = {
  id: "sc_8f21",
  date: "Oct 28",
  time: "2:14 pm",
  city: "Lahore",
  overall: 74,
  change: 3,
  skinType: "Combination",
  age: 27,
  metrics: [
    { key: "moisture", name: "Moisture", note: "Good hydration on cheeks", value: 68, meaning: "How well your skin holds water. Above 70 is well hydrated.", helps: ["Hyaluronic acid", "Glycerin", "Ceramides"] },
    { key: "oiliness", name: "Oiliness", note: "Shine across forehead and nose", value: 42, meaning: "Visible shine and sebum. A lower score means more oil.", helps: ["Niacinamide", "Zinc", "Salicylic acid"] },
    { key: "pores", name: "Pores", note: "Visible on nose and inner cheeks", value: 51, meaning: "How visible your pores are. Oil and heat make them look larger.", helps: ["Niacinamide", "BHA (salicylic acid)"] },
    { key: "acne", name: "Acne", note: "A few small spots on chin", value: 71, meaning: "Active spots and blemishes.", helps: ["Salicylic acid", "Benzoyl peroxide", "Azelaic acid"] },
    { key: "redness", name: "Redness", note: "Low", value: 78, meaning: "Visible redness and irritation.", helps: ["Centella", "Azelaic acid"] },
    { key: "texture", name: "Texture", note: "Mostly smooth", value: 66, meaning: "Smoothness and evenness of the surface.", helps: ["Gentle AHA", "Retinoids"] },
    { key: "wrinkles", name: "Wrinkles", note: "Minimal", value: 88, meaning: "Fine lines and wrinkles.", helps: ["Retinoids", "Peptides", "Daily SPF"] },
    { key: "darkCircles", name: "Dark circles", note: "Mild", value: 59, meaning: "Darkness under the eyes.", helps: ["Caffeine", "Vitamin C"] },
  ] satisfies Metric[],
  priorities: ["Control shine", "Minimize pores", "Keep hydration up"],
};

export const scanHistory = [
  { id: "sc_1a01", date: "Aug 30", score: 62, city: "Lahore" },
  { id: "sc_2b14", date: "Sep 14", score: 64, city: "Lahore" },
  { id: "sc_3c28", date: "Sep 28", score: 66, city: "Lahore" },
  { id: "sc_4d05", date: "Oct 5", score: 68, city: "Karachi" },
  { id: "sc_5e12", date: "Oct 12", score: 71, city: "Lahore" },
  { id: "sc_8f21", date: "Oct 28", score: 74, city: "Lahore" },
];

// ---------------------------------------------------------------------------------------------
// Products

export type Category = "Cleansers" | "Serums" | "Moisturizers" | "Sunscreens" | "Exfoliants" | "Aftercare";
export const categories: Category[] = ["Cleansers", "Serums", "Moisturizers", "Sunscreens", "Exfoliants", "Aftercare"];

export type Ingredient = { name: string; tone: "good" | "neutral" | "avoid"; note: string };
export type StoreOffer = { store: string; price: number; verified: boolean; checked: string; delivery: string; url: string };

export type Product = {
  id: string;
  brand: string;
  name: string;
  category: Category;
  size: string;
  tags: string[];
  match: number;
  rating: number;
  reviews: string;
  suitable: boolean;
  notSuitableReason?: string;
  why: string[];
  ingredients: Ingredient[];
  offers: StoreOffer[];
  texture: string;
};

export const products: Product[] = [
  {
    id: "lrp-uvmune", brand: "La Roche-Posay", name: "Anthelios UVMune 400 Invisible Fluid SPF 50+", category: "Sunscreens", size: "50 ml",
    tags: ["Oil-free", "SPF 50+"], match: 94, rating: 4.6, reviews: "2.1k", suitable: true, texture: "Fluid",
    why: ["UV is 8 in Lahore today; this gives SPF 50+ protection", "Fluid texture, no shine: suits your oiliness score (42)", "Fragrance-free, matching your avoid list"],
    ingredients: [
      { name: "Mexoryl 400", tone: "good", note: "Filters long UVA rays that most sunscreens miss." },
      { name: "Glycerin", tone: "good", note: "Draws water into the skin." },
      { name: "Alcohol (low)", tone: "neutral", note: "Small amount for a light finish; usually fine." },
    ],
    offers: [
      { store: "Daraz.pk", price: 5890, verified: true, checked: "1 h ago", delivery: "2–3 days", url: "https://www.daraz.pk" },
      { store: "Naheed.pk", price: 6100, verified: false, checked: "3 h ago", delivery: "1–2 days", url: "https://www.naheed.pk" },
    ],
  },
  {
    id: "to-niacinamide", brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", category: "Serums", size: "30 ml",
    tags: ["Pores", "Oil control"], match: 91, rating: 4.4, reviews: "8.7k", suitable: true, texture: "Light serum",
    why: ["Targets your oiliness (42) and pores (51)", "Works morning and night, so one bottle covers both routines", "Fits well under your budget"],
    ingredients: [
      { name: "Niacinamide", tone: "good", note: "Reduces shine and the look of pores." },
      { name: "Zinc PCA", tone: "good", note: "Helps balance oil." },
    ],
    offers: [{ store: "Naheed.pk", price: 3150, verified: true, checked: "1 h ago", delivery: "1–2 days", url: "https://www.naheed.pk" }],
  },
  {
    id: "neutrogena-hydro", brand: "Neutrogena", name: "Hydro Boost Water Gel", category: "Moisturizers", size: "50 ml",
    tags: ["Gel", "Fragrance-free"], match: 88, rating: 4.5, reviews: "5.3k", suitable: true, texture: "Gel",
    why: ["Gel texture for 62% humidity", "Hyaluronic acid keeps moisture (68) up without heaviness"],
    ingredients: [
      { name: "Hyaluronic acid", tone: "good", note: "Holds water in the skin." },
      { name: "Dimethicone", tone: "neutral", note: "Smooth, silky feel." },
    ],
    offers: [{ store: "Vegas Beauty", price: 3400, verified: false, checked: "5 h ago", delivery: "2–4 days", url: "https://example.com" }],
  },
  {
    id: "garnier-micellar", brand: "Garnier", name: "Micellar Cleansing Water", category: "Cleansers", size: "400 ml",
    tags: ["Gentle", "Makeup removal"], match: 83, rating: 4.3, reviews: "12k", suitable: true, texture: "Water",
    why: ["Removes sunscreen and smog particles (AQI 152) as a first cleanse", "No rinsing needed"],
    ingredients: [{ name: "Micelles", tone: "good", note: "Lift dirt and SPF without scrubbing." }],
    offers: [{ store: "Daraz.pk", price: 1250, verified: true, checked: "1 h ago", delivery: "2–3 days", url: "https://www.daraz.pk" }],
  },
  {
    id: "cerave-foaming", brand: "CeraVe", name: "Foaming Facial Cleanser", category: "Cleansers", size: "236 ml",
    tags: ["Oily skin", "Ceramides"], match: 90, rating: 4.6, reviews: "9.1k", suitable: true, texture: "Foam",
    why: ["Removes overnight oil gently", "Ceramides protect the skin barrier"],
    ingredients: [
      { name: "Ceramides", tone: "good", note: "Repair the skin barrier." },
      { name: "Niacinamide", tone: "good", note: "Calms and balances oil." },
    ],
    offers: [{ store: "Daraz.pk", price: 4200, verified: true, checked: "2 h ago", delivery: "2–3 days", url: "https://www.daraz.pk" }],
  },
  {
    id: "paulas-bha", brand: "Paula's Choice", name: "Skin Perfecting 2% BHA Liquid Exfoliant", category: "Exfoliants", size: "118 ml",
    tags: ["Pores", "2x a week"], match: 89, rating: 4.7, reviews: "15k", suitable: true, texture: "Liquid",
    why: ["Salicylic acid clears inside pores (51)", "Use twice a week in the evening"],
    ingredients: [{ name: "Salicylic acid", tone: "good", note: "Oil-soluble exfoliant that clears pores." }],
    offers: [{ store: "Brand site", price: 9800, verified: true, checked: "1 h ago", delivery: "5–7 days", url: "https://example.com" }],
  },
  {
    id: "cosrx-snail", brand: "COSRX", name: "Advanced Snail 96 Mucin Essence", category: "Serums", size: "100 ml",
    tags: ["Hydrating", "Calming"], match: 80, rating: 4.5, reviews: "6.4k", suitable: true, texture: "Essence",
    why: ["Adds a hydration layer for drier climates"],
    ingredients: [{ name: "Snail mucin", tone: "good", note: "Hydrates and soothes." }],
    offers: [{ store: "Daraz.pk", price: 4650, verified: false, checked: "6 h ago", delivery: "3–5 days", url: "https://www.daraz.pk" }],
  },
  {
    id: "bioderma-photoderm", brand: "Bioderma", name: "Photoderm Aquafluide SPF 50+", category: "Sunscreens", size: "40 ml",
    tags: ["Water-resistant", "Matte"], match: 86, rating: 4.4, reviews: "1.8k", suitable: true, texture: "Fluid",
    why: ["Water-resistant: good for beach trips", "Matte finish for oily T-zone"],
    ingredients: [{ name: "Ectoin", tone: "good", note: "Protects against heat and UV stress." }],
    offers: [{ store: "Naheed.pk", price: 4990, verified: true, checked: "2 h ago", delivery: "1–2 days", url: "https://www.naheed.pk" }],
  },
  {
    id: "nivea-soft", brand: "NIVEA", name: "Soft Light Moisturising Cream", category: "Moisturizers", size: "100 ml",
    tags: ["Cream"], match: 62, rating: 4.2, reviews: "20k", suitable: false, texture: "Cream",
    notSuitableReason: "Contains fragrance (on your avoid list)",
    why: ["Richer cream, better for dry air"],
    ingredients: [{ name: "Parfum", tone: "avoid", note: "Fragrance is on your avoid list." }],
    offers: [{ store: "Daraz.pk", price: 950, verified: true, checked: "1 h ago", delivery: "2–3 days", url: "https://www.daraz.pk" }],
  },
  {
    id: "aloe-gel", brand: "Nature Republic", name: "Soothing & Moisture Aloe Vera 92% Gel", category: "Aftercare", size: "300 ml",
    tags: ["After-sun", "Cooling"], match: 84, rating: 4.4, reviews: "11k", suitable: true, texture: "Gel",
    why: ["Calms skin after long sun exposure", "Light enough for oily skin"],
    ingredients: [{ name: "Aloe vera", tone: "good", note: "Cools and soothes sun-exposed skin." }],
    offers: [{ store: "Daraz.pk", price: 1650, verified: true, checked: "2 h ago", delivery: "2–3 days", url: "https://www.daraz.pk" }],
  },
];

export const productById = (id: string) => products.find((p) => p.id === id);
export const lowestPrice = (p: Product) => Math.min(...p.offers.map((o) => o.price));

// ---------------------------------------------------------------------------------------------
// Plan

export type PlanStep = { id: string; category: string; productId: string; reason: string; owned?: boolean };
export type Plan = { morning: PlanStep[]; evening: PlanStep[] };

export const defaultPlan: Plan = {
  morning: [
    { id: "m1", category: "Cleanser", productId: "cerave-foaming", reason: "Removes overnight oil gently", owned: true },
    { id: "m2", category: "Serum", productId: "to-niacinamide", reason: "Targets your oiliness (42) and pores (51)" },
    { id: "m3", category: "Moisturizer", productId: "neutrogena-hydro", reason: "Gel texture for 62% humidity" },
    { id: "m4", category: "Sunscreen", productId: "lrp-uvmune", reason: "UV 8 today · reapply at 1 pm" },
  ],
  evening: [
    { id: "e1", category: "Cleansing oil", productId: "garnier-micellar", reason: "Removes SPF and smog (AQI 152)" },
    { id: "e2", category: "Serum", productId: "to-niacinamide", reason: "Same serum, used morning and night", owned: true },
    { id: "e3", category: "Moisturizer", productId: "neutrogena-hydro", reason: "Same gel moisturizer, morning and night", owned: true },
  ],
};

/** Next ranked alternatives per category (Swap popover). */
export const alternatives: Record<string, string[]> = {
  Cleanser: ["garnier-micellar", "cerave-foaming"],
  "Cleansing oil": ["cerave-foaming"],
  Serum: ["cosrx-snail", "paulas-bha"],
  Moisturizer: ["cosrx-snail", "nivea-soft"],
  Sunscreen: ["bioderma-photoderm"],
};

export const PLAN_BUDGET_PKR = 15000;

// ---------------------------------------------------------------------------------------------
// Saved, trips, notifications

export const savedPlans = [
  { id: "pl_lhr_1028", name: "Lahore · Oct 28", status: "Current" as const, steps: 7, totalPkr: 13690, from: "scan of Oct 28", weatherChanged: true },
  { id: "tr_dxb_1105", name: "Dubai trip · Nov 5–10", status: "Upcoming trip" as const, steps: 4, totalPkr: 15900, from: "4 changes to pack", weatherChanged: false },
  { id: "pl_lhr_1012", name: "Lahore · Oct 12", status: "Archived" as const, steps: 6, totalPkr: 11200, from: "scan of Oct 12", weatherChanged: false },
];

export const defaultWishlist = ["lrp-uvmune", "paulas-bha", "cosrx-snail"];

export const notifications = [
  { id: "n1", kind: "weather", title: "Air quality got worse in Lahore", body: "AQI is 152 today. Double-cleanse tonight.", time: "10 min ago", unread: true },
  { id: "n2", kind: "price", title: "Price drop", body: "Paula's Choice BHA is 12% cheaper on the brand site.", time: "2 h ago", unread: true },
  { id: "n3", kind: "trip", title: "Dubai trip in 6 days", body: "Your trip kit has 4 changes to pack.", time: "Yesterday", unread: false },
  { id: "n4", kind: "scan", title: "Time for a new scan", body: "It's been 2 weeks. Scan in similar light to track changes.", time: "2 days ago", unread: false },
];

export const concernOptions = ["Oiliness", "Acne and breakouts", "Dark spots", "Dryness", "Redness", "Large pores", "Fine lines"];
export const commonAvoid = ["Fragrance", "Alcohol denat.", "Essential oils", "Parabens", "Sulfates"];
