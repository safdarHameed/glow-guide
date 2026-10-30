"use client";

import { useRouter } from "next/navigation";
import { Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Overlay";
import { cities, cityById, type City } from "@/lib/mock-data";

/**
 * S08: the global way to change location. Keeps the skin scan; refreshes weather, stores, prices and currency.
 * "A trip destination" opens the trip planner instead of changing home.
 */
export function CityPicker({ open, onClose, initialTab = "now" }: { open: boolean; onClose: () => void; initialTab?: "now" | "trip" }) {
  const router = useRouter();
  const toast = useToast();
  const { city, setCity, recentCityIds, setPlanOutdated } = useAppState();
  const [tab, setTab] = useState<"now" | "trip">(initialTab);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
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

  // Autocomplete after 2 letters, debounced 300 ms (blueprint S08).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const results = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (q.length < 2) return [];
    return cities.filter((c) => c.name.toLowerCase().startsWith(q) || c.country.toLowerCase().startsWith(q)).slice(0, 5);
  }, [debounced]);

  useEffect(() => setActive(0), [results]);

  function useMyLocation() {
    setGeoHint(null);
    if (!navigator.geolocation) {
      setGeoHint("Location isn't available in this browser. Search for your city instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        // Reverse geocoding comes with the environment API; sample data resolves to Lahore.
        setLocating(false);
        setSelected(cityById("lahore"));
      },
      () => {
        setLocating(false);
        setGeoHint("Location access is off. Search for your city instead.");
        document.getElementById("city-search")?.focus();
      },
      { timeout: 8000 },
    );
  }

  function confirm() {
    if (!selected) return;
    if (tab === "trip") {
      onClose();
      router.push(`/trip?to=${selected.id}`);
      return;
    }
    const previous = city.id;
    setCity(selected.id);
    setPlanOutdated(false);
    onClose();
    toast(`Plan updated for ${selected.name}`, {
      label: "Undo",
      onClick: () => setCity(previous),
    });
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
          <Button onClick={confirm} disabled={!selected}>
            {tab === "trip" ? "Plan this trip" : "Update my plan"}
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
          {locating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
          Use my current location
        </button>
      )}
      {geoHint && <p className="mt-2 text-xs text-sun-700">{geoHint}</p>}

      <div className="relative mt-3">
        <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input
          id="city-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            if (e.key === "Enter" && results[active]) setSelected(results[active]);
          }}
          placeholder="Search a city"
          autoComplete="off"
          className="h-12 w-full rounded-2xl border border-line pr-4 pl-11 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {results.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-2xl border border-line" role="listbox">
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                onClick={() => setSelected(c)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm ${
                  selected?.id === c.id ? "bg-brand-50" : i === active ? "bg-canvas" : ""
                }`}
              >
                <span>
                  <span className="font-medium text-ink">{c.name}</span> <span className="text-muted">{c.country}</span>
                </span>
                <span className="text-xs text-muted">
                  {c.temp}° · UV {c.uv} · AQI {c.aqi ?? "n/a"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {debounced.trim().length >= 2 && results.length === 0 && (
        <p className="mt-3 text-sm text-muted">No cities match &ldquo;{debounced}&rdquo;.</p>
      )}

      <p className="mt-5 text-xs font-semibold tracking-wide text-muted uppercase">Recent</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {recentCityIds.map((id) => {
          const c = cityById(id);
          return (
            <button
              key={id}
              onClick={() => setSelected(c)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm ring-1 ${
                selected?.id === id ? "bg-brand-500 text-white ring-brand-500" : "text-ink-soft ring-line hover:ring-brand-300"
              }`}
            >
              <MapPin size={13} /> {c.name}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-5 rounded-2xl bg-ink p-4 text-white">
          <p className="text-sm font-semibold">
            {selected.name}, {selected.country}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {selected.temp}° · UV {selected.uv} · AQI {selected.aqi ?? "not available"} · {selected.humidity}% humidity
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
