"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { MetricBar, Reveal } from "@/components/ui/Motion";
import { routes } from "@/lib/routes";

type Overlay = "oiliness" | "pores" | "acne" | "redness";

const overlays: Record<Overlay, { color: string; shapes: React.ReactNode }> = {
  oiliness: {
    color: "#D9822F",
    shapes: (
      <>
        <ellipse cx="100" cy="80" rx="42" ry="14" />
        <ellipse cx="100" cy="142" rx="11" ry="24" />
      </>
    ),
  },
  pores: {
    color: "#3F87B5",
    shapes: (
      <>
        <ellipse cx="100" cy="150" rx="13" ry="14" />
        <ellipse cx="80" cy="152" rx="11" ry="9" />
        <ellipse cx="120" cy="152" rx="11" ry="9" />
      </>
    ),
  },
  acne: {
    color: "#C4504B",
    shapes: (
      <>
        <circle cx="92" cy="206" r="5" />
        <circle cx="109" cy="210" r="4" />
        <circle cx="101" cy="199" r="3.5" />
      </>
    ),
  },
  redness: {
    color: "#C4504B",
    shapes: (
      <>
        <ellipse cx="66" cy="162" rx="16" ry="12" />
        <ellipse cx="134" cy="162" rx="16" ry="12" />
      </>
    ),
  },
};

const metrics = [
  { name: "Moisture", note: "Good hydration on cheeks", value: 68 },
  { name: "Oiliness", note: "Shine across forehead and nose", value: 42, overlay: "oiliness" as Overlay },
  { name: "Pores", note: "Visible on nose and inner cheeks", value: 51, overlay: "pores" as Overlay },
  { name: "Acne", note: "A few small spots on chin", value: 71, overlay: "acne" as Overlay },
  { name: "Redness", note: "Low", value: 78, overlay: "redness" as Overlay },
  { name: "Texture", note: "Mostly smooth", value: 66 },
  { name: "Wrinkles", note: "Minimal", value: 88 },
  { name: "Dark circles", note: "Mild", value: 59 },
];

export function ReportPreview() {
  const [overlay, setOverlay] = useState<Overlay>("oiliness");
  const [show, setShow] = useState(true);
  const o = overlays[overlay];

  return (
    <section id="report" className="relative bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-page px-4 sm:px-8 xl:px-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-brand-500 uppercase">Your skin report</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            8 measurements, explained in plain words
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            See exactly where each score comes from, then get your top three priorities before the plan is built.
          </p>
        </Reveal>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Face with overlay */}
          <Reveal>
            <div className="rounded-3xl border border-line bg-canvas/70 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(overlays) as Overlay[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        setOverlay(k);
                        setShow(true);
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                        overlay === k ? "bg-ink text-white" : "bg-white text-ink-soft hover:bg-brand-100"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShow((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
                  aria-pressed={show}
                >
                  {show ? <Eye size={14} /> : <EyeOff size={14} />} Overlay {show ? "on" : "off"}
                </button>
              </div>

              <div className="relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-b from-brand-50 via-canvas to-sun-50">
                <div className="animate-scan absolute inset-x-0 z-10 h-10 bg-gradient-to-b from-transparent via-brand-300/30 to-transparent" />
                <svg viewBox="0 0 200 260" className="mx-auto h-[340px] w-full" role="img" aria-label={`Face map showing ${overlay}`}>
                  <defs>
                    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="5" />
                    </filter>
                    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F6E3D3" />
                      <stop offset="100%" stopColor="#EED2BC" />
                    </linearGradient>
                  </defs>
                  {/* neck + shoulders */}
                  <path d="M78 215 L78 245 Q100 252 122 245 L122 215 Z" fill="#E9C9AF" />
                  <path d="M30 260 Q40 238 78 236 L122 236 Q160 238 170 260 Z" fill="#24695C" opacity="0.85" />
                  {/* face */}
                  <ellipse cx="100" cy="135" rx="68" ry="92" fill="url(#skin)" />
                  {/* hair */}
                  <path
                    d="M32 120 Q30 40 100 36 Q170 40 168 120 Q160 78 128 66 Q100 82 64 70 Q40 84 32 120 Z"
                    fill="#2B2420"
                  />
                  {/* brows */}
                  <path d="M62 104 Q74 97 86 103" stroke="#3B2F28" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <path d="M114 103 Q126 97 138 104" stroke="#3B2F28" strokeWidth="3" strokeLinecap="round" fill="none" />
                  {/* eyes */}
                  <ellipse cx="74" cy="118" rx="8" ry="4.5" fill="#fff" />
                  <ellipse cx="126" cy="118" rx="8" ry="4.5" fill="#fff" />
                  <circle cx="74" cy="118" r="3.2" fill="#3B2F28" />
                  <circle cx="126" cy="118" r="3.2" fill="#3B2F28" />
                  {/* nose */}
                  <path d="M100 124 Q97 145 93 152 Q100 157 107 152" stroke="#C9A288" strokeWidth="2" strokeLinecap="round" fill="none" />
                  {/* lips */}
                  <path d="M84 181 Q100 192 116 181 Q100 186 84 181 Z" fill="#C97B76" />
                  {/* overlay */}
                  <AnimatePresence mode="wait">
                    {show && (
                      <motion.g
                        key={overlay}
                        fill={o.color}
                        filter="url(#soft)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                      >
                        {o.shapes}
                      </motion.g>
                    )}
                  </AnimatePresence>
                </svg>
              </div>
            </div>
          </Reveal>

          {/* Measurements */}
          <Reveal delay={0.15}>
            <div className="rounded-3xl border border-line bg-canvas/70 p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">8 skin measurements</p>
                <p className="text-xs text-muted">Higher is better</p>
              </div>
              <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {metrics.map((m, i) => (
                  <li
                    key={m.name}
                    onClick={() => {
                      if (!m.overlay) return;
                      setOverlay(m.overlay);
                      setShow(true);
                    }}
                    className={`rounded-xl p-2 -m-2 transition-colors ${
                      m.overlay ? "cursor-pointer hover:bg-white" : ""
                    } ${m.overlay === overlay && show ? "bg-white" : ""}`}
                  >
                    <MetricBar label={m.name} value={m.value} delay={i * 0.07} />
                  </li>
                ))}
              </ul>

              <div className="mt-7 rounded-2xl bg-brand-50 p-5">
                <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Your priorities</p>
                <ol className="mt-3 grid gap-2 sm:grid-cols-3">
                  {["Control shine", "Minimize pores", "Keep hydration up"].map((p, i) => (
                    <li key={p} className="flex items-center gap-2.5 rounded-xl bg-white p-3 text-sm font-medium text-ink">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500 text-xs text-white">
                        {i + 1}
                      </span>
                      {p}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted">Cosmetic estimates from a photo, not a medical diagnosis.</p>
                <Link
                  href={routes.sampleReport}
                  className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-600"
                >
                  Explore the sample report
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
