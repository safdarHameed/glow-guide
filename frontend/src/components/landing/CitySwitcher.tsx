"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowLeftRight, Check, Droplets, MapPin, Plus, Sun, Wind } from "lucide-react";
import { useState } from "react";
import { Reveal, ScoreRing } from "@/components/ui/Motion";

type Change = { kind: "keep" | "swap" | "add"; text: string };

const cities = [
  {
    id: "lahore",
    name: "Lahore",
    country: "Pakistan",
    humidity: 62,
    uv: 8,
    aqi: 152,
    total: "PKR 13,690",
    changes: [
      { kind: "swap", text: "Cream → gel moisturizer (62% humidity)" },
      { kind: "add", text: "Double-cleanse at night (AQI 152)" },
      { kind: "keep", text: "Niacinamide serum for oiliness" },
    ] as Change[],
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    humidity: 38,
    uv: 10,
    aqi: 61,
    total: "AED 410",
    changes: [
      { kind: "swap", text: "Gel → richer cream (38% humidity)" },
      { kind: "add", text: "Water-resistant SPF 50+ (UV 10)" },
      { kind: "keep", text: "Niacinamide serum for oiliness" },
    ] as Change[],
  },
  {
    id: "london",
    name: "London",
    country: "UK",
    humidity: 81,
    uv: 1,
    aqi: 28,
    total: "£ 74",
    changes: [
      { kind: "swap", text: "SPF 50 → everyday SPF 30 (UV 1)" },
      { kind: "keep", text: "Single cleanse, clean air (AQI 28)" },
      { kind: "keep", text: "Niacinamide serum for oiliness" },
    ] as Change[],
  },
];

const changeStyle = {
  keep: { icon: Check, cls: "bg-brand-50 text-brand-600", label: "Keep" },
  swap: { icon: ArrowLeftRight, cls: "bg-sky-50 text-sky-600", label: "Swap" },
  add: { icon: Plus, cls: "bg-sun-50 text-sun-700", label: "Add" },
};

export function CitySwitcher() {
  const [active, setActive] = useState(cities[0]);

  return (
    <section id="any-city" className="relative overflow-hidden bg-sky-50 py-24 sm:py-32">
      <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-sky-200/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-brand-100/70 blur-3xl" />
      <div className="relative mx-auto max-w-page px-4 sm:px-8 xl:px-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-sky-600 uppercase">The big idea</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Change place. <span className="italic text-brand-500">Keep your skin.</span>
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Move or travel and your plan updates for the new weather, stores and currency. No new scan needed.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10 flex justify-center">
          <LayoutGroup>
            <div className="flex flex-wrap justify-center gap-1 rounded-full bg-white p-1.5 shadow-sm ring-1 ring-sky-100">
              {cities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActive(c)}
                  className={`relative rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                    active.id === c.id ? "text-white" : "text-ink-soft hover:text-ink"
                  }`}
                  aria-pressed={active.id === c.id}
                >
                  {active.id === c.id && (
                    <motion.span
                      layoutId="city-pill"
                      className="absolute inset-0 rounded-full bg-brand-500 shadow-md"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <MapPin size={14} /> {c.name}
                  </span>
                </button>
              ))}
            </div>
          </LayoutGroup>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <Reveal delay={0.15}>
            <div className="flex h-full flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-[0_24px_50px_-30px_rgba(63,135,181,0.45)] ring-1 ring-sky-100">
              <ScoreRing score={74} size={120} label="overall" />
              <p className="mt-5 text-lg font-semibold text-ink">Your skin: Combination</p>
              <p className="mt-1 text-sm text-muted">Scanned once. Reused in every city.</p>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="relative h-full overflow-hidden rounded-3xl bg-ink p-7 text-white shadow-[0_30px_60px_-30px_rgba(23,38,42,0.6)]">
              <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                >
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/60">Your plan for</p>
                      <p className="text-3xl font-semibold">
                        {active.name}, <span className="text-white/60">{active.country}</span>
                      </p>
                    </div>
                    <p className="text-2xl font-semibold text-sun-300">{active.total}</p>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-2">
                    <Stat icon={Sun} value={`UV ${active.uv}`} iconCls="text-sun-300" />
                    <Stat icon={Wind} value={`AQI ${active.aqi}`} iconCls="text-rose-300" />
                    <Stat icon={Droplets} value={`${active.humidity}%`} iconCls="text-sky-300" />
                  </div>

                  <ul className="mt-6 space-y-2">
                    {active.changes.map((ch, i) => {
                      const s = changeStyle[ch.kind];
                      return (
                        <motion.li
                          key={ch.text}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.12 + i * 0.08 }}
                          className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10"
                        >
                          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>
                            <s.icon size={12} /> {s.label}
                          </span>
                          <span className="text-sm text-white/90">{ch.text}</span>
                        </motion.li>
                      );
                    })}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  value,
  iconCls,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string;
  iconCls: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/[0.07] px-3 py-2.5 ring-1 ring-white/10">
      <Icon size={16} className={iconCls} />
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
