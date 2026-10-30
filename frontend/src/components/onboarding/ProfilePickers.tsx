"use client";

import { MapPin, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/Kit";
import { cities, commonAvoid, concernOptions, formatPrice, products, type City, type Currency } from "@/lib/mock-data";

/** Shared by onboarding (S03) and settings (S14): both edit the same profile fields. */

export function ConcernPicker({ value, onChange, max = 3 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const [hint, setHint] = useState(false);
  function toggle(c: string) {
    if (value.includes(c)) {
      setHint(false);
      onChange(value.filter((x) => x !== c));
    } else if (value.length >= max) {
      setHint(true);
    } else {
      onChange([...value, c]);
    }
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {concernOptions.map((c) => (
          <Chip key={c} selected={value.includes(c)} onClick={() => toggle(c)}>
            {c}
          </Chip>
        ))}
      </div>
      {hint && <p className="mt-2 text-xs font-medium text-sun-700">Pick up to {max}. Remove one to choose another.</p>}
    </div>
  );
}

export function AvoidPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const options = [...commonAvoid, ...value.filter((v) => !commonAvoid.includes(v))];

  function add() {
    const t = text.trim();
    if (t && !value.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...value, t]);
    setText("");
    setAdding(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((o) => (
        <Chip key={o} selected={value.includes(o)} onClick={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])}>
          {o}
        </Chip>
      ))}
      {adding ? (
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
            if (e.key === "Escape") setAdding(false);
          }}
          onBlur={add}
          placeholder="e.g. Coconut oil"
          className="h-9 w-40 rounded-full border border-brand-300 px-3.5 text-sm outline-none focus:ring-4 focus:ring-brand-100"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-line px-3.5 text-sm font-medium text-brand-600 hover:border-brand-300"
        >
          <Plus size={14} /> Add ingredient
        </button>
      )}
    </div>
  );
}

const productNames = products.map((p) => `${p.brand} ${p.name}`);

export function OwnedPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (q.length < 2) return [];
    return productNames.filter((n) => n.toLowerCase().includes(q) && !value.includes(n)).slice(0, 5);
  }, [text, value]);

  function add(name: string) {
    const t = name.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setText("");
    setActive(0);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((v) => (
          <span key={v} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-50 pr-1.5 pl-3.5 text-sm font-medium text-brand-700">
            {v}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="rounded-full p-1 hover:bg-brand-100">
              <X size={13} />
            </button>
          </span>
        ))}
      </div>
      <div className="relative mt-2 max-w-md">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, suggestions.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            if (e.key === "Enter") {
              e.preventDefault();
              add(suggestions[active] ?? text);
            }
          }}
          placeholder="Type a product name…"
          className="h-11 w-full rounded-xl border border-line px-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-white shadow-lg">
            {suggestions.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(s)}
                  className={`w-full px-4 py-2.5 text-left text-sm ${i === active ? "bg-canvas" : ""}`}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted">Press Enter to add. We won&apos;t recommend things you already have.</p>
    </div>
  );
}

const BUDGET_MAX_PKR = 30000;

export function BudgetPicker({
  mode,
  min,
  max,
  currency,
  onChange,
}: {
  mode: "product" | "routine";
  min: number;
  max: number;
  currency: Currency;
  onChange: (v: { mode: "product" | "routine"; min: number; max: number }) => void;
}) {
  return (
    <div>
      <div className="inline-grid grid-cols-2 gap-1 rounded-full bg-canvas p-1">
        {(["product", "routine"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange({ mode: m, min, max })}
            className={`rounded-full px-4 py-2 text-sm font-medium ${mode === m ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {m === "product" ? "Per product" : "Whole routine"}
          </button>
        ))}
      </div>
      <p className="mt-5 text-2xl font-semibold text-ink">
        {formatPrice(min, currency)} – {formatPrice(max, currency)}
      </p>
      <div className="mt-4 max-w-md space-y-4">
        <label className="block text-xs text-muted">
          Minimum
          <input
            type="range"
            min={0}
            max={BUDGET_MAX_PKR}
            step={500}
            value={min}
            onChange={(e) => onChange({ mode, min: Math.min(Number(e.target.value), max - 500), max })}
            className="mt-1 w-full accent-brand-500"
          />
        </label>
        <label className="block text-xs text-muted">
          Maximum
          <input
            type="range"
            min={0}
            max={BUDGET_MAX_PKR}
            step={500}
            value={max}
            onChange={(e) => onChange({ mode, min, max: Math.max(Number(e.target.value), min + 500) })}
            className="mt-1 w-full accent-brand-500"
          />
        </label>
      </div>
    </div>
  );
}

export function CitySearch({ onSelect, exclude, autoFocus }: { onSelect: (c: City) => void; exclude?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const pool = cities.filter((c) => c.id !== exclude);
    return s ? pool.filter((c) => c.name.toLowerCase().startsWith(s) || c.country.toLowerCase().startsWith(s)) : pool.slice(0, 5);
  }, [q, exclude]);

  return (
    <div>
      <div className="relative">
        <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && results[0] && onSelect(results[0])}
          placeholder="Search your city"
          className="h-11 w-full rounded-xl border border-line pr-4 pl-11 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        />
      </div>
      <ul className="mt-2 max-h-56 overflow-y-auto">
        {results.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-canvas"
            >
              <MapPin size={14} className="text-brand-500" />
              <span className="font-medium text-ink">{c.name}</span>
              <span className="text-muted">{c.country}</span>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">No cities match &ldquo;{q}&rdquo;.</li>}
      </ul>
    </div>
  );
}
