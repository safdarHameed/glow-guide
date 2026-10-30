"use client";

import { motion } from "motion/react";
import { CloudSun, ScanFace, ShoppingBag } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";

const steps = [
  {
    icon: ScanFace,
    title: "Scan your skin",
    body: "A 20-second selfie measures 8 visible skin features with YouCam Skin AI, from moisture and oiliness to pores and redness.",
    detail: "Live light and framing checks get a usable photo the first time.",
    color: "brand",
  },
  {
    icon: CloudSun,
    title: "Read your environment",
    body: "Live UV, humidity and air quality for any city, turned into clear skin rules you can act on today.",
    detail: "UV 8 → SPF 50 and reapply · AQI 152 → double-cleanse tonight.",
    color: "sun",
  },
  {
    icon: ShoppingBag,
    title: "Shop locally",
    body: "A morning and evening routine from stores that deliver to you, within your budget, with a reason for every pick.",
    detail: "Real prices from real store pages. Nothing invented.",
    color: "sky",
  },
] as const;

const palette = {
  brand: { chip: "bg-brand-50 text-brand-500 ring-brand-100", num: "text-brand-500" },
  sun: { chip: "bg-sun-50 text-sun-600 ring-sun-100", num: "text-sun-600" },
  sky: { chip: "bg-sky-50 text-sky-600 ring-sky-100", num: "text-sky-600" },
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-brand-50 py-24 sm:py-32">
      <div className="mx-auto max-w-page px-4 sm:px-8 xl:px-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-brand-500 uppercase">How it works</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            From selfie to shopping list in three steps
          </h2>
          <p className="mt-4 text-lg text-ink-soft">Your full routine in under three minutes.</p>
        </Reveal>

        <div className="relative mt-16 grid gap-6 md:grid-cols-3">
          {/* connecting line */}
          <svg
            className="pointer-events-none absolute top-14 left-[16%] hidden h-2 w-[68%] md:block"
            viewBox="0 0 100 2"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <motion.line
              x1="0"
              y1="1"
              x2="100"
              y2="1"
              stroke="#ABD6C9"
              strokeWidth="2"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            />
          </svg>

          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.15}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group relative h-full rounded-3xl border border-line bg-white p-7 shadow-[0_1px_0_rgba(23,38,42,0.04)] transition-shadow hover:shadow-[0_24px_50px_-24px_rgba(23,38,42,0.25)]"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`relative z-10 grid h-14 w-14 place-items-center rounded-2xl ring-8 transition-transform duration-300 group-hover:scale-110 ${palette[s.color].chip}`}
                  >
                    <s.icon size={26} />
                  </div>
                  <span className={`font-serif text-5xl font-semibold opacity-15 ${palette[s.color].num}`}>
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{s.body}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
