"use client";

import { motion } from "motion/react";
import { Plane, Sun, TrendingUp, Wallet } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";

const uvHours = [1, 2, 4, 6, 7, 8, 8, 7, 5, 3, 2, 1];
const scoreHistory = [62, 64, 66, 68, 71, 74];

export function Features() {
  return (
    <section id="features" className="relative overflow-hidden bg-sun-50 py-24 sm:py-32">
      <div className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-sun-200/50 blur-3xl" />
      <div className="relative mx-auto max-w-page px-4 sm:px-8 xl:px-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-sun-700 uppercase">And more</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Built around your real day
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-6">
          <Card className="md:col-span-4">
            <Header icon={Sun} tone="sun" title="Weather turned into skin rules" />
            <p className="mt-2 text-sm text-ink-soft">The peak sun window is flagged for your reapply reminder.</p>
            <div className="mt-6 flex h-28 items-end gap-1.5">
              {uvHours.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(v / 8) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex-1 rounded-t-md ${v >= 7 ? "bg-sun-500" : v >= 4 ? "bg-sun-300" : "bg-sun-100"}`}
                  title={`UV ${v}`}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted">
              <span>7 am</span>
              <span className="font-semibold text-sun-600">Peak 12–2 pm</span>
              <span>6 pm</span>
            </div>
          </Card>

          <Card className="md:col-span-2" delay={0.1}>
            <Header icon={TrendingUp} tone="brand" title="Track progress" />
            <p className="mt-2 text-sm text-ink-soft">Rescan every 2–4 weeks.</p>
            <svg viewBox="0 0 200 90" className="mt-5 w-full" aria-hidden="true">
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#24695C" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#24695C" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = scoreHistory.map((s, i) => [10 + i * 36, 80 - (s - 58) * 4.2] as const);
                const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
                return (
                  <>
                    <motion.path
                      d={`${d} L190 90 L10 90 Z`}
                      fill="url(#area)"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.8, duration: 0.8 }}
                    />
                    <motion.path
                      d={d}
                      fill="none"
                      stroke="#24695C"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.4, ease: "easeInOut" }}
                    />
                    {pts.map((p, i) => (
                      <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4.5 : 3} fill="#fff" stroke="#24695C" strokeWidth="2" />
                    ))}
                  </>
                );
              })()}
            </svg>
            <p className="mt-2 text-sm">
              <span className="font-semibold text-ink">74</span>{" "}
              <span className="font-medium text-brand-500">+3 since Oct 12</span>
            </p>
          </Card>

          <Card className="md:col-span-3">
            <Header icon={Plane} tone="sky" title="Trip planner" />
            <p className="mt-2 text-sm text-ink-soft">Know what to keep, swap and add before you fly.</p>
            <div className="mt-5 rounded-2xl bg-canvas p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-ink">
                <span>Lahore</span>
                <span className="flex flex-1 items-center gap-2 px-3">
                  <span className="h-px flex-1 border-t border-dashed border-sky-300" />
                  <Plane size={16} className="text-sky-500" />
                  <span className="h-px flex-1 border-t border-dashed border-sky-300" />
                </span>
                <span>Dubai</span>
              </div>
              <p className="mt-3 text-center text-xs text-ink-soft">Drier air, extreme UV: add water-resistant SPF 50+.</p>
            </div>
          </Card>

          <Card className="md:col-span-3" delay={0.1}>
            <Header icon={Wallet} tone="brand" title="Your budget and rules" />
            <p className="mt-2 text-sm text-ink-soft">Avoided ingredients are filtered out. Products you own cost 0.</p>
            <div className="mt-5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-ink">PKR 13,690</span>
                <span className="text-muted">of PKR 15,000</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-line">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500"
                  initial={{ width: 0 }}
                  whileInView={{ width: "91%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-600 line-through decoration-rose-300">
                  Fragrance
                </span>
                <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-600">✓ Cleanser owned</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Card({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className={className}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="h-full rounded-3xl border border-sun-100 bg-white p-6 shadow-[0_20px_40px_-30px_rgba(185,106,34,0.5)] transition-shadow hover:shadow-[0_28px_50px_-26px_rgba(185,106,34,0.55)]"
      >
        {children}
      </motion.div>
    </Reveal>
  );
}

const tones = {
  brand: "bg-brand-50 text-brand-500",
  sun: "bg-sun-50 text-sun-600",
  sky: "bg-sky-50 text-sky-600",
};

function Header({
  icon: Icon,
  title,
  tone,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  tone: keyof typeof tones;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon size={20} />
      </span>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
    </div>
  );
}
