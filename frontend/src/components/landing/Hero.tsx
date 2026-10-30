"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Camera, CloudSun, Droplets, FileText, MapPin, ShieldCheck, Sparkles, Sun, Wind } from "lucide-react";
import { MetricBar, ScoreRing } from "@/components/ui/Motion";
import { routes } from "@/lib/routes";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.15 + i * 0.1, ease } }),
};

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-36 lg:pt-40 lg:pb-28">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="animate-blob absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-brand-200/50 blur-3xl" />
        <div className="animate-blob absolute top-10 right-[-120px] h-[460px] w-[460px] rounded-full bg-sun-200/50 blur-3xl [animation-delay:-6s]" />
        <div className="animate-blob absolute bottom-[-160px] left-1/3 h-[420px] w-[420px] rounded-full bg-sky-200/50 blur-3xl [animation-delay:-12s]" />
      </div>

      <div className="mx-auto grid max-w-page items-center gap-14 px-4 sm:px-8 xl:px-12 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-brand-600 shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              Powered by YouCam Skin AI
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-6 font-serif text-[2.6rem] leading-[1.08] font-semibold tracking-tight text-ink sm:text-6xl lg:text-[4.1rem] xl:text-[4.75rem]"
          >
            Skincare that knows{" "}
            <span className="relative inline-block text-brand-500">
              your face
              <motion.svg
                viewBox="0 0 200 12"
                className="absolute -bottom-1.5 left-0 h-3 w-full"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <motion.path
                  d="M2 8 C 50 2, 150 2, 198 7"
                  stroke="#ECAE67"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.9, ease }}
                />
              </motion.svg>
            </span>{" "}
            and <span className="text-gradient-weather italic">your weather.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-soft lg:mx-0 xl:text-xl"
          >
            Scan a selfie, check today&apos;s UV and air quality, and get a routine built from products you can
            actually buy in your city.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <Link
              href={routes.startScan}
              className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-brand-500 px-7 py-4 text-base font-medium text-white shadow-[0_14px_34px_-12px_rgba(36,105,92,0.75)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600 sm:w-auto"
            >
              <span className="shimmer-btn animate-shimmer absolute inset-0" aria-hidden="true" />
              <Camera size={18} className="relative" />
              <span className="relative">Start free scan</span>
              <ArrowRight size={18} className="relative transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href={routes.sampleReport}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white/80 px-7 py-4 text-base font-medium text-ink shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-600 sm:w-auto"
            >
              <FileText size={18} />
              See a sample report
            </Link>
          </motion.div>

          <motion.p
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-6 flex items-center justify-center gap-2 text-sm text-muted lg:justify-start"
          >
            <ShieldCheck size={16} className="text-brand-500" />
            Photos are analyzed, then deleted. Not a medical diagnosis.
          </motion.p>
        </div>

        {/* Preview cards */}
        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto h-[650px] w-full max-w-[520px] sm:h-[560px] xl:h-[600px] xl:max-w-[600px]">
      {/* Skin card */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 0.9, delay: 0.35, ease }}
        className="absolute top-0 left-0 w-[78%] sm:w-[68%]"
      >
        <div className="animate-float relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_30px_60px_-25px_rgba(23,38,42,0.35)] backdrop-blur-xl">
          <div className="animate-scan absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-brand-300/25 to-transparent" />
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Your skin today</p>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-600">Combination</span>
          </div>
          <div className="mt-4 flex items-center gap-5">
            <ScoreRing score={74} size={92} />
            <div className="flex-1 space-y-3">
              <MetricBar label="Hydration" value={68} delay={0.5} />
              <MetricBar label="Oil control" value={42} delay={0.65} />
              <MetricBar label="Clarity" value={71} delay={0.8} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Weather card */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 0.55, ease }}
        className="absolute top-[30%] right-0 w-[78%] sm:top-[36%] sm:w-[58%]"
      >
        <div className="animate-float-slow rounded-3xl bg-ink p-5 text-white shadow-[0_30px_60px_-20px_rgba(23,38,42,0.55)] [animation-delay:-3s]">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <MapPin size={14} className="text-sun-300" /> Lahore today
            </p>
            <CloudSun size={22} className="text-sun-300" />
          </div>
          <p className="mt-3 text-4xl font-semibold">34°</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-xl bg-white/10 p-2.5">
              <Sun size={14} className="mb-1 text-sun-300" />
              <p className="font-semibold">UV 8</p>
              <p className="text-white/60">very high</p>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5">
              <Wind size={14} className="mb-1 text-rose-300" />
              <p className="font-semibold">AQI 152</p>
              <p className="text-white/60">unhealthy</p>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5">
              <Droplets size={14} className="mb-1 text-sky-300" />
              <p className="font-semibold">62%</p>
              <p className="text-white/60">humidity</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tip card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.85, ease }}
        className="absolute top-[65%] left-0 w-[78%] sm:top-[66%] sm:w-[56%]"
      >
        <div className="animate-float rounded-2xl border border-sun-200 bg-sun-50/95 p-4 shadow-[0_20px_40px_-20px_rgba(217,130,47,0.5)] backdrop-blur [animation-delay:-1.5s]">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-sun-700 uppercase">
            <Sparkles size={13} /> Today&apos;s tip
          </p>
          <p className="mt-1.5 text-sm leading-snug text-ink">
            Swap your cream for a gel moisturizer and reapply SPF 50 at 1 pm.
          </p>
        </div>
      </motion.div>

      {/* Product card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.05, ease }}
        className="absolute right-0 bottom-0 w-[82%] sm:w-[58%]"
      >
        <div className="animate-float-slow flex items-center gap-3 rounded-2xl border border-white/70 bg-white/95 p-3.5 shadow-[0_24px_50px_-22px_rgba(23,38,42,0.4)] backdrop-blur [animation-delay:-5s]">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sun-100 to-sun-200">
            <Sun size={22} className="text-sun-600" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">Sunscreen SPF 50 gel</p>
            <p className="text-xs text-muted">PKR 2,350 · in stock nearby</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-600">
            94%
          </span>
        </div>
      </motion.div>
    </div>
  );
}
