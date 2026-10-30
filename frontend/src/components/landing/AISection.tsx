"use client";

import { AnimatePresence, motion } from "motion/react";
import { Ban, Check, CloudSun, Loader2, ScanFace, Search, ShieldCheck, Sparkles, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { MetricBar, Reveal } from "@/components/ui/Motion";

const STEP_MS = 5000;

const steps = [
  {
    icon: ScanFace,
    tag: "YouCam Skin AI",
    title: "Sees your skin",
    body: "Reads 8 skin features from one selfie and returns a score plus a map of where each one shows.",
    bg: "bg-brand-500",
  },
  {
    icon: CloudSun,
    tag: "Open-Meteo + rules",
    title: "Reads your sky",
    body: "Turns today's UV, humidity and air quality into plain skin rules. No guessing involved.",
    bg: "bg-sun-500",
  },
  {
    icon: Search,
    tag: "AI search agent",
    title: "Searches your stores",
    body: "Browses real store pages in your city and pulls out price, stock and ingredients.",
    bg: "bg-sky-500",
  },
  {
    icon: Sparkles,
    tag: "AI ranker",
    title: "Picks and explains",
    body: "Ranks what's left for your skin and writes one reason per pick, tied to real numbers.",
    bg: "bg-rose-500",
  },
];

const guardrails = [
  { icon: Ban, text: "Never invents products" },
  { icon: Tag, text: "Unconfirmed prices are tagged" },
  { icon: ShieldCheck, text: "Your avoid list always wins" },
];

export function AISection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setActive((a) => (a + 1) % steps.length), STEP_MS);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <section id="ai" className="relative overflow-hidden bg-ink py-24 text-white sm:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-grid absolute inset-0 opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
        <div className="animate-blob absolute -top-32 -left-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="animate-blob absolute -right-24 -bottom-32 h-96 w-96 rounded-full bg-sky-500/25 blur-3xl [animation-delay:-9s]" />
      </div>

      <div className="relative mx-auto max-w-page px-4 sm:px-8 xl:px-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-200 uppercase ring-1 ring-white/15">
            <Sparkles size={13} /> The AI behind your plan
          </p>
          <h2 className="mt-5 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            AI that <span className="italic text-sun-300">shows its work</span>
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Four steps, each one explained. Every pick comes with a reason that cites a real number.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          {/* Pipeline */}
          <Reveal>
            <ol className="space-y-3">
              {steps.map((s, i) => {
                const isActive = i === active;
                return (
                  <li key={s.title}>
                    <button
                      onClick={() => setActive(i)}
                      aria-current={isActive}
                      className={`relative w-full overflow-hidden rounded-2xl p-4 text-left ring-1 transition-all duration-300 ${
                        isActive ? "bg-white/[0.09] ring-white/25" : "bg-white/[0.03] ring-white/10 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors duration-300 ${
                            isActive ? `${s.bg} text-white` : "bg-white/10 text-white/60"
                          }`}
                        >
                          <s.icon size={20} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">
                            Step {i + 1} · {s.tag}
                          </p>
                          <p className="mt-0.5 text-lg font-semibold">{s.title}</p>
                          <AnimatePresence initial={false}>
                            {isActive && (
                              <motion.p
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden text-sm leading-relaxed text-white/65"
                              >
                                <span className="block pt-1">{s.body}</span>
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      {isActive && (
                        <motion.span
                          key={`bar-${active}`}
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: STEP_MS / 1000, ease: "linear" }}
                          className={`absolute bottom-0 left-0 h-0.5 ${s.bg}`}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </Reveal>

          {/* Output */}
          <Reveal delay={0.12}>
            <div className="relative h-full min-h-[380px] overflow-hidden rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/15 backdrop-blur">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span className="font-semibold tracking-wide uppercase">Output · step {active + 1}</span>
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-300 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-300" />
                  </span>
                  Live demo
                </span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-5"
                >
                  {active === 0 && <SkinPanel />}
                  {active === 1 && <RulesPanel />}
                  {active === 2 && <SearchPanel />}
                  {active === 3 && <RankerPanel />}
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mt-8">
          <ul className="flex flex-wrap justify-center gap-3">
            {guardrails.map((g) => (
              <li
                key={g.text}
                className="flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-sm text-white/80 ring-1 ring-white/10"
              >
                <g.icon size={15} className="text-brand-200" /> {g.text}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xl font-semibold">{children}</p>;
}

function SkinPanel() {
  return (
    <div>
      <PanelTitle>Scores and masks from one selfie</PanelTitle>
      <div className="mt-6 space-y-5 [&_span]:text-white/80 [&>div_div.bg-line]:bg-white/15">
        <MetricBar label="Oiliness" value={42} delay={0.1} />
        <MetricBar label="Pores" value={51} delay={0.2} />
        <MetricBar label="Moisture" value={68} delay={0.3} />
      </div>
      <p className="mt-6 rounded-xl bg-white/[0.06] p-3 text-sm text-white/65 ring-1 ring-white/10">
        Each score also comes with a highlighted map of the face. The selfie itself is deleted after analysis.
      </p>
    </div>
  );
}

function RulesPanel() {
  const rows = [
    { input: "UV 8", output: "SPF 50 + reapply at 1 pm", cls: "bg-sun-500/20 text-sun-200" },
    { input: "AQI 152", output: "Double-cleanse tonight", cls: "bg-rose-500/20 text-rose-100" },
    { input: "Humidity 62% + oily", output: "Gel texture, not cream", cls: "bg-sky-500/20 text-sky-200" },
  ];
  return (
    <div>
      <PanelTitle>Weather becomes skin rules</PanelTitle>
      <ul className="mt-6 space-y-3">
        {rows.map((r, i) => (
          <motion.li
            key={r.input}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.12 }}
            className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10"
          >
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium">{r.input}</span>
            <span className="text-white/40">→</span>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${r.cls}`}>{r.output}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function SearchPanel() {
  const stores = [
    ["Daraz", 14],
    ["Naheed", 9],
    ["Vegas Beauty", 7],
    ["Brand sites", 8],
  ] as const;
  return (
    <div>
      <PanelTitle>Checking real stores in Lahore</PanelTitle>
      <ul className="mt-6 space-y-2.5">
        {stores.map(([name, n], i) => (
          <motion.li
            key={name}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.35 }}
            className="flex items-center justify-between rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10"
          >
            <span className="text-sm font-medium">{name}</span>
            <span className="relative flex items-center gap-2 text-sm text-white/70">
              <motion.span
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ delay: 0.5 + i * 0.35, duration: 0.2 }}
                className="absolute left-0"
              >
                <Loader2 size={15} className="animate-spin" />
              </motion.span>
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.35 }}
                className="text-brand-300"
              >
                <Check size={15} />
              </motion.span>
              {n} found
            </span>
          </motion.li>
        ))}
      </ul>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="mt-5 text-sm font-medium text-brand-200"
      >
        38 products from 6 stores, with prices read from the store pages.
      </motion.p>
    </div>
  );
}

function RankerPanel() {
  const reasons = [
    { chip: "UV 8", text: "SPF 50+ protection for today's UV", cls: "bg-sun-500/20 text-sun-200" },
    { chip: "Oiliness 42", text: "Fluid texture, no added shine", cls: "bg-rose-500/20 text-rose-100" },
    { chip: "Avoid list", text: "Fragrance-free, as you asked", cls: "bg-brand-500/25 text-brand-200" },
  ];
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-white/50">Best sunscreen for you today</p>
          <PanelTitle>La Roche-Posay UVMune 400</PanelTitle>
        </div>
        <span className="shrink-0 rounded-full bg-brand-500 px-3 py-1 text-sm font-semibold">94% match</span>
      </div>
      <p className="mt-6 text-xs font-semibold tracking-wide text-white/50 uppercase">Why it fits you</p>
      <ul className="mt-3 space-y-2.5">
        {reasons.map((r, i) => (
          <motion.li
            key={r.chip}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.25 }}
            className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10"
          >
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${r.cls}`}>{r.chip}</span>
            <span className="text-sm text-white/85">{r.text}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
