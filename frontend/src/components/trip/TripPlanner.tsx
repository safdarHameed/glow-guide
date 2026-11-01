"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Plane } from "lucide-react";
import { CitySearch } from "@/components/onboarding/ProfilePickers";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, Chip, PageHeader, Tag } from "@/components/ui/Kit";
import { asCity, formatPrice, type City, type PlanRecord } from "@/lib/domain";
import { glowApi, message } from "@/lib/glow-api";

function isoDay(offset: number) {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  return day.toISOString().slice(0, 10);
}
export function TripPlanner() {
  const params = useSearchParams();
  const toast = useToast();
  const {
    city: home,
    mergeProducts,
    refreshPlans,
    productById,
  } = useAppState();
  const [destination, setDestination] = useState<City | null>(null);
  const [start, setStart] = useState(isoDay(6));
  const [end, setEnd] = useState(isoDay(11));
  const [type, setType] = useState<"beach" | "city" | "work">("city");
  const [buyAt, setBuyAt] = useState<"home" | "dest">("home");
  const [result, setResult] = useState<PlanRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [builtFrom, setBuiltFrom] = useState("");
  const key = JSON.stringify([destination?.id, start, end, type, buyAt]);
  useEffect(() => {
    let active = true;
    const id = params.get("plan"),
      to = params.get("to");
    if (id)
      glowApi
        .plan(id)
        .then((p) => {
          if (!active || !p.trip) return;
          setDestination(p.trip.destination);
          setStart(p.trip.start);
          setEnd(p.trip.end);
          setType(p.trip.tripType);
          setBuyAt(p.trip.buyAt);
          setResult(p);
          mergeProducts(p.products);
          setBuiltFrom(
            JSON.stringify([
              p.trip.destination.id,
              p.trip.start,
              p.trip.end,
              p.trip.tripType,
              p.trip.buyAt,
            ]),
          );
        })
        .catch((err) => {
          if (active) setError(message(err));
        });
    else if (to)
      glowApi
        .cities(to)
        .then((data) => {
          if (active && data.cities[0]) setDestination(asCity(data.cities[0]));
        })
        .catch((err) => {
          if (active) setError(message(err));
        });
    return () => {
      active = false;
    };
  }, [params, mergeProducts]);
  async function build() {
    if (!destination) return;
    setBusy(true);
    setError(null);
    try {
      const plan = await glowApi.trip(destination, start, end, type, buyAt);
      setResult(plan);
      mergeProducts(plan.products);
      setBuiltFrom(key);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  const trip = result?.trip;
  const rows = trip
    ? [
        ["Temperature", `${trip.home.temp}°`, `${trip.destination.temp}°`],
        ["Humidity", `${trip.home.humidity}%`, `${trip.destination.humidity}%`],
        ["UV index", trip.home.uv, trip.destination.uv],
        [
          "Air quality",
          trip.home.aqi ?? "Not available",
          trip.destination.aqi ?? "Not available",
        ],
      ]
    : [];
  return (
    <>
      <PageHeader
        title="Trip planner"
        context="Compare conditions and build a kit for your destination."
      />
      <Card>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-muted">From</p>
            <p className="mb-5 text-sm font-semibold text-ink">
              {home.name}, {home.country}
            </p>
            <p className="mb-2 text-xs font-medium text-muted">
              To{" "}
              {destination
                ? `· ${destination.name}, ${destination.country}`
                : ""}
            </p>
            <CitySearch exclude={home.id} onSelect={setDestination} />
          </div>
          <div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Departure", start, setStart],
                ["Return", end, setEnd],
              ].map(([label, value, setter]) => (
                <label key={label as string} className="text-xs text-muted">
                  {label as string}
                  <input
                    aria-label={label as string}
                    type="date"
                    min={isoDay(0)}
                    value={value as string}
                    onChange={(e) =>
                      (setter as (v: string) => void)(e.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-line px-3"
                  />
                </label>
              ))}
            </div>
            <p className="mt-5 mb-2 text-xs text-muted">Trip type</p>
            <div className="flex gap-2">
              {(["beach", "city", "work"] as const).map((t) => (
                <Chip key={t} selected={type === t} onClick={() => setType(t)}>
                  {t}
                </Chip>
              ))}
            </div>
            <p className="mt-5 mb-2 text-xs text-muted">Where to shop</p>
            <div className="flex flex-wrap gap-2">
              {(["home", "dest"] as const).map((place) => (
                <Chip
                  key={place}
                  selected={buyAt === place}
                  onClick={() => setBuyAt(place)}
                >
                  {place === "home"
                    ? `Before I go · ${home.name}`
                    : `On arrival · ${destination?.name ?? "destination"}`}
                </Chip>
              ))}
            </div>
            <Button
              className="mt-6"
              disabled={
                busy ||
                !destination ||
                !home.id ||
                end < start ||
                start < isoDay(0)
              }
              onClick={() => void build()}
            >
              <Plane size={16} />
              {busy ? "Checking conditions and products…" : "Build trip kit"}
            </Button>
          </div>
        </div>
      </Card>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600"
        >
          {error}
        </p>
      )}
      {trip && result && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="font-semibold text-ink">
              How {trip.destination.name} differs
            </h2>
            <p className="mt-1 text-xs text-muted">{trip.label}</p>
            <table className="mt-5 w-full text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th>Condition</th>
                  <th>{trip.home.name}</th>
                  <th>{trip.destination.name}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, a, b]) => (
                  <tr key={label} className="border-b border-line">
                    <td className="py-4">{label}</td>
                    <td>{a}</td>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trip.notes.map((note) => (
              <p
                key={note}
                className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-700"
              >
                {note}
              </p>
            ))}
          </Card>
          <Card>
            <h2 className="font-semibold text-ink">Your trip kit</h2>
            <ul className="mt-4 space-y-3">
              {trip.kit.map((item) => {
                const p = productById(item.productId);
                return (
                  <li key={item.productId}>
                    <Link
                      href={`?${params.toString()}&product=${item.productId}`}
                      className="flex items-start gap-3 rounded-xl border border-line p-3"
                    >
                      <Tag tone={item.kind === "keep" ? "brand" : "sun"}>
                        {item.kind}
                      </Tag>
                      <span className="text-sm text-ink">
                        <strong>
                          {p?.brand} {p?.name}
                        </strong>
                        <span className="mt-1 block text-xs text-muted">
                          {item.text}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <a
              href="https://www.exchangerate-api.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-xs text-muted"
            >
              Budget conversion rates by ExchangeRate-API
            </a>
            <p className="mt-5 font-semibold text-ink">
              {formatPrice(result.total, result.city.currency)}
            </p>
            {result.notes.map((note) => (
              <p key={note} className="mt-3 text-sm text-sun-700">
                {note}
              </p>
            ))}
            {key !== builtFrom && (
              <p className="mt-3 text-sm text-sun-700">
                Details changed. Rebuild the kit before saving.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <ButtonLink
                href={`/products?trip=${result.id}`}
                variant="secondary"
              >
                See trip products
              </ButtonLink>
              <Button
                disabled={busy || key !== builtFrom}
                onClick={async () => {
                  try {
                    await glowApi.updatePlan(result.id, { saved: true });
                    await refreshPlans();
                    toast("Trip plan saved");
                  } catch (err) {
                    toast(message(err));
                  }
                }}
              >
                Save trip plan
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
