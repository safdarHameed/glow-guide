"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, ArrowRight, Check, ChevronDown, MapPin, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { CitySearch } from "@/components/onboarding/ProfilePickers";
import { ProductThumb } from "@/components/app/ProductThumb";
import { useProductLink } from "@/components/app/useProductLink";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, Chip, PageHeader, Popover, Tag } from "@/components/ui/Kit";
import { cities, cityById, formatPrice, lowestPrice, productById, type City } from "@/lib/mock-data";

type TripType = "beach" | "city" | "work";
type KitRow = { kind: "keep" | "swap" | "add"; productId: string; fromId?: string; text: string };

const isoDay = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

function differences(home: City, dest: City) {
  const t = dest.temp - home.temp;
  const h = dest.humidity - home.humidity;
  const temp = Math.abs(t) < 2 ? "About the same" : t < 0 ? `${-t}° cooler` : `${t}° warmer`;
  const humidity = h <= -20 ? "Much drier" : h <= -8 ? "Drier" : h >= 20 ? "Much more humid" : h >= 8 ? "More humid" : "Similar";
  const uv = dest.uv >= 11 ? "Extreme" : dest.uv > home.uv ? "Stronger sun" : dest.uv < home.uv ? "Milder sun" : "Same";
  const aqi =
    dest.aqi === null || home.aqi === null
      ? "No air data"
      : dest.aqi < home.aqi - 20
        ? "Cleaner air"
        : dest.aqi > home.aqi + 20
          ? "More polluted"
          : "Similar";
  return { temp, humidity, uv, aqi, humidityDelta: h };
}

function summary(home: City, dest: City, type: TripType, humidityDelta: number) {
  const parts: string[] = [];
  if (humidityDelta <= -15) parts.push("Drier air: your skin may feel tight even though it is oily at home. Expect to need more hydration.");
  if (humidityDelta >= 15) parts.push("More humid air: keep textures light and gel-based.");
  if (dest.uv >= 8 || type === "beach") parts.push(type === "beach" ? "Beach sun calls for water-resistant SPF and after-sun care." : "Strong sun: SPF 50 and reapply often.");
  if (dest.aqi !== null && dest.aqi >= 100) parts.push("Smoggy air: double-cleanse every night.");
  if (dest.uv <= 3 && type !== "beach") parts.push(`Milder sun than ${home.name}: an everyday SPF 30 is enough.`);
  return parts.join(" ") || "Conditions are close to home. Your current routine should travel well.";
}

function buildKit(home: City, dest: City, type: TripType): KitRow[] {
  const h = dest.humidity - home.humidity;
  const rows: KitRow[] = [
    { kind: "keep", productId: "to-niacinamide", text: "Niacinamide serum" },
    { kind: "keep", productId: "cerave-foaming", text: "Cleanser" },
  ];
  if (h <= -15) rows.push({ kind: "swap", productId: "cosrx-snail", fromId: "neutrogena-hydro", text: `Gel moisturizer → richer hydration (${dest.humidity}% humidity)` });
  else rows.push({ kind: "keep", productId: "neutrogena-hydro", text: "Gel moisturizer" });
  if (type === "work") rows.push({ kind: "swap", productId: "garnier-micellar", fromId: "cerave-foaming", text: "Compact, no-rinse cleanse for work days" });
  if (dest.uv >= 8 || type === "beach") rows.push({ kind: "add", productId: "bioderma-photoderm", text: `Water-resistant SPF 50+${type === "beach" ? " for the beach" : ` (UV ${dest.uv})`}` });
  else rows.push({ kind: "keep", productId: "lrp-uvmune", text: "Sunscreen" });
  if (type === "beach") rows.push({ kind: "add", productId: "aloe-gel", text: "After-sun aloe gel" });
  if (dest.aqi !== null && dest.aqi >= 100) rows.push({ kind: "add", productId: "garnier-micellar", text: `First cleanse for smog (AQI ${dest.aqi})` });
  return rows;
}

const kindStyle = {
  keep: { label: "Keep", icon: Check, tone: "brand" as const },
  swap: { label: "Swap", icon: ArrowLeftRight, tone: "sky" as const },
  add: { label: "Add", icon: Plus, tone: "sun" as const },
};

/** S12: compares home and destination; never changes the home city or current plan. */
export function TripPlanner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const productLink = useProductLink();
  const { city: home } = useAppState();

  const initialDest = cities.find((c) => c.id === params.get("to") && c.id !== home.id) ?? cityById(home.id === "dubai" ? "london" : "dubai");
  const [dest, setDest] = useState<City>(initialDest);
  const [start, setStart] = useState(isoDay(6));
  const [end, setEnd] = useState(isoDay(11));
  const [type, setType] = useState<TripType>("beach");
  const [buyAt, setBuyAt] = useState<"home" | "dest">("home");

  const diff = useMemo(() => differences(home, dest), [home, dest]);
  const kit = useMemo(() => buildKit(home, dest, type), [home, dest, type]);
  const toBuy = kit.filter((r) => r.kind !== "keep");
  const buyCurrency = buyAt === "home" ? home.currency : dest.currency;
  const buyTotal = toBuy.reduce((sum, r) => sum + lowestPrice(productById(r.productId)!), 0);
  const mainCategory = toBuy[0] ? productById(toBuy[0].productId)!.category : "Sunscreens";

  const daysUntil = Math.round((new Date(start).getTime() - Date.now()) / 86_400_000);
  const forecastLabel =
    daysUntil <= 16 ? "Forecast average for your dates" : `Typical for ${new Date(start).toLocaleString("en-US", { month: "long" })}`;
  const datesValid = end >= start;

  const rows: [string, string, string, string][] = [
    ["Temperature", `${home.temp}°`, `${dest.temp}°`, diff.temp],
    ["Humidity", `${home.humidity}%`, `${dest.humidity}%`, diff.humidity],
    ["UV index", `${home.uv}`, `${dest.uv}`, diff.uv],
    ["Air quality", `${home.aqi ?? "n/a"}`, `${dest.aqi ?? "n/a"}`, diff.aqi],
  ];

  return (
    <>
      <PageHeader title="Trip planner" context="Get your routine ready before you travel. Your home plan stays the same." />

      <Card>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.3fr]">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">From</p>
            <div className="flex h-12 items-center gap-2 rounded-xl bg-canvas px-4 text-sm font-medium text-ink">
              <MapPin size={15} className="text-brand-500" /> {home.name}, {home.country}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">To</p>
            <Popover
              align="left"
              className="w-80"
              trigger={({ toggle }) => (
                <button
                  onClick={toggle}
                  className="flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-line px-4 text-sm font-medium text-ink hover:border-brand-300"
                >
                  <span className="flex items-center gap-2 truncate">
                    <MapPin size={15} className="text-sky-500" /> {dest.name}, {dest.country}
                  </span>
                  <ChevronDown size={16} className="text-muted" />
                </button>
              )}
            >
              {(close) => (
                <div className="p-1.5">
                  <CitySearch
                    autoFocus
                    exclude={home.id}
                    onSelect={(c) => {
                      setDest(c);
                      router.replace(`/trip?to=${c.id}`, { scroll: false });
                      close();
                    }}
                  />
                </div>
              )}
            </Popover>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">Dates</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={start}
                min={isoDay(0)}
                onChange={(e) => setStart(e.target.value)}
                aria-label="Start date"
                className="h-12 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand-400"
              />
              <span className="text-muted">–</span>
              <input
                type="date"
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
                aria-label="End date"
                className="h-12 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand-400"
              />
            </div>
            {!datesValid && <p className="mt-1 text-xs text-rose-600">The end date must be after the start date.</p>}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium text-muted">Trip type</span>
          {(["beach", "city", "work"] as const).map((t) => (
            <Chip key={t} selected={type === t} onClick={() => setType(t)}>
              {t[0]!.toUpperCase() + t.slice(1)}
            </Chip>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">How {dest.name} differs</h2>
            <span className="text-xs text-muted">{forecastLabel}</span>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 font-medium" />
                <th className="py-2 font-medium">{home.name}</th>
                <th className="py-2 font-medium">{dest.name}</th>
                <th className="py-2 font-medium">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(([label, a, b, change]) => (
                <tr key={label}>
                  <td className="py-3 text-muted">{label}</td>
                  <td className="py-3 text-ink">{a}</td>
                  <td className="py-3 font-semibold text-ink">{b}</td>
                  <td className="py-3 text-ink-soft">{change}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-700">{summary(home, dest, type, diff.humidityDelta)}</p>
        </Card>

        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Your trip kit</h2>
            <span className="text-xs text-muted">Based on your current plan</span>
          </div>
          <ul className="mt-4 space-y-2">
            {kit.map((r) => {
              const s = kindStyle[r.kind];
              const p = productById(r.productId)!;
              return (
                <li key={`${r.kind}-${r.productId}-${r.text}`}>
                  <Link href={productLink(r.productId)} scroll={false} className="flex items-center gap-3 rounded-2xl border border-line p-3 hover:border-brand-300">
                    <Tag tone={s.tone} className="w-16 justify-center">
                      <s.icon size={12} /> {s.label}
                    </Tag>
                    <ProductThumb category={p.category} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{r.text}</span>
                      <span className="block truncate text-xs text-muted">
                        {p.brand} {p.name}
                      </span>
                    </span>
                    {r.kind !== "keep" && <span className="text-xs font-semibold text-ink">{formatPrice(lowestPrice(p), buyCurrency)}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-canvas p-1">
            {(["home", "dest"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBuyAt(b)}
                className={`rounded-full px-3 py-2 text-xs font-medium sm:text-sm ${buyAt === b ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {b === "home" ? `Buy before I go (${home.name})` : `Buy in ${dest.name} (${dest.currency})`}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            {toBuy.length} {toBuy.length === 1 ? "item" : "items"} to get · about <span className="font-semibold text-ink">{formatPrice(buyTotal, buyCurrency)}</span>{" "}
            {buyAt === "home" ? `from ${home.name} stores, to pack` : `if bought on arrival`}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href={`/products?category=${mainCategory}`} variant="secondary">
              See trip products <ArrowRight size={16} />
            </ButtonLink>
            <Button
              disabled={!datesValid}
              onClick={() =>
                toast("Trip plan saved · we'll remind you 2 days before departure", { label: "View", onClick: () => router.push("/saved?tab=plans") })
              }
            >
              Save trip plan
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
