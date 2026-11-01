"use client";

import { useRouter } from "next/navigation";
import { Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Overlay";
import { asCity, type City } from "@/lib/domain";
import { glowApi, message } from "@/lib/glow-api";
import { useCitySearch } from "@/lib/useCitySearch";

/**
 * S08: the global way to change location. Keeps the skin scan; refreshes weather, stores, prices and currency.
 * "A trip destination" opens the trip planner instead of changing home.
 */
export function CityPicker({
  open,
  onClose,
  initialTab = "now",
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: "now" | "trip";
}) {
  const router = useRouter();
  const toast = useToast();
  const {
    city,
    setCity,
    recentCityIds,
    cityById,
    latestScan,
    adoptPlan,
    planRecord,
  } = useAppState();
  const [tab, setTab] = useState<"now" | "trip">(initialTab);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<City | null>(null);
  const [active, setActive] = useState(0);
  const [locating, setLocating] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setQuery("");
      setSelected(null);
      setGeoHint(null);
    }
  }, [open, initialTab]);

  const { results: locations, error: searchError } = useCitySearch(query);
  const results = locations.map(asCity);
  useEffect(() => {
    if (!selected) return;
    let current = true;
    glowApi
      .environment(selected)
      .then((env) => {
        if (current) setSelected(env.city);
      })
      .catch((err) => {
        if (current) setGeoHint(message(err));
      });
    return () => {
      current = false;
    };
    // Refresh only on selection changes, not on the returned weather values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => setActive(0), [locations]);

  function useMyLocation() {
    setGeoHint(null);
    if (!navigator.geolocation) {
      setGeoHint(
        "Location isn't available in this browser. Search for your city instead.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          setSelected(
            asCity(await glowApi.reverse(coords.latitude, coords.longitude)),
          );
        } catch (err) {
          setGeoHint(message(err));
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setGeoHint("Location access is off. Search for your city instead.");
        document.getElementById("city-search")?.focus();
      },
      { timeout: 8000 },
    );
  }

  async function confirm() {
    if (!selected) return;
    if (tab === "trip") {
      onClose();
      router.push(`/trip?to=${encodeURIComponent(selected.name)}`);
      return;
    }
    setBusy(true);
    setGeoHint(null);
    const previous = city;
    const previousPlan = planRecord;
    if (!(await setCity(selected))) {
      setBusy(false);
      return;
    }
    try {
      if (latestScan) adoptPlan(await glowApi.buildPlan(selected));
      onClose();
      toast(`Location updated for ${selected.name}`, {
        label: "Undo",
        onClick: async () => {
          if (await setCity(previous)) {
            if (previousPlan) {
              await glowApi.updatePlan(previousPlan.id, { isCurrent: true });
              adoptPlan(previousPlan);
            }
          }
        },
      });
    } catch (err) {
      setGeoHint(message(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Where should we plan for?"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!selected || busy}>
            {busy
              ? "Updating…"
              : tab === "trip"
                ? "Plan this trip"
                : "Update my plan"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-1 rounded-full bg-canvas p-1">
        {(["now", "trip"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full py-2 text-sm font-medium transition-colors ${tab === t ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {t === "now" ? "Where I am now" : "A trip destination"}
          </button>
        ))}
      </div>

      {tab === "now" && (
        <button
          onClick={useMyLocation}
          className="mt-4 flex w-full items-center gap-2 rounded-2xl border border-line px-4 py-3 text-sm font-medium text-brand-600 hover:border-brand-300 hover:bg-brand-50"
        >
          {locating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LocateFixed size={16} />
          )}
          Use my current location
        </button>
      )}
      {(geoHint || searchError) && (
        <p className="mt-2 text-xs text-sun-700">{geoHint || searchError}</p>
      )}

      <div className="relative mt-3">
        <Search
          size={16}
          className="absolute top-1/2 left-4 -translate-y-1/2 text-muted"
        />
        <input
          id="city-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown")
              setActive((a) => Math.min(a + 1, results.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            if (e.key === "Enter" && results[active])
              setSelected(results[active]);
          }}
          placeholder="Search a city"
          autoComplete="off"
          className="h-12 w-full rounded-2xl border border-line pr-4 pl-11 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {results.length > 0 && (
        <ul
          className="mt-2 overflow-hidden rounded-2xl border border-line"
          role="listbox"
        >
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                onClick={() => setSelected(c)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm ${
                  selected?.id === c.id
                    ? "bg-brand-50"
                    : i === active
                      ? "bg-canvas"
                      : ""
                }`}
              >
                <span>
                  <span className="font-medium text-ink">{c.name}</span>{" "}
                  <span className="text-muted">{c.country}</span>
                </span>
                <span className="text-xs text-muted">
                  {c.temp}° · UV {c.uv} · AQI {c.aqi ?? "n/a"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-3 text-sm text-muted">
          No cities match &ldquo;{query}&rdquo;.
        </p>
      )}

      <p className="mt-5 text-xs font-semibold tracking-wide text-muted uppercase">
        Recent
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {recentCityIds.map((id) => {
          const c = cityById(id);
          return (
            <button
              key={id}
              onClick={() => setSelected(c)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm ring-1 ${
                selected?.id === id
                  ? "bg-brand-500 text-white ring-brand-500"
                  : "text-ink-soft ring-line hover:ring-brand-300"
              }`}
            >
              <MapPin size={13} /> {c.name}
            </button>
          );
        })}
      </div>

      <a
        href="https://www.exchangerate-api.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block text-[10px] text-muted"
      >
        Budget conversion rates by ExchangeRate-API
      </a>
      {selected && (
        <div className="mt-5 rounded-2xl bg-ink p-4 text-white">
          <p className="text-sm font-semibold">
            {selected.name}, {selected.country}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {selected.temp}° · UV {selected.uv} · AQI{" "}
            {selected.aqi ?? "not available"} · {selected.humidity}% humidity
          </p>
          <p className="mt-3 text-xs text-white/60">
            {tab === "trip"
              ? "Your home city and current plan stay the same."
              : `Your skin scan stays the same. Weather, products, prices and currency will update for ${selected.name}.`}
          </p>
        </div>
      )}
    </Modal>
  );
}
