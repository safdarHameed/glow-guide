"use client";

import { AnimatePresence, motion } from "motion/react";

export type Overlay = "oiliness" | "pores" | "acne" | "redness";
export const overlayKeys: Overlay[] = ["oiliness", "pores", "acne", "redness"];

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

/** Illustrated face with the selected YouCam mask drawn on top (sample shapes until real masks arrive). */
export function FaceMap({ overlay, show }: { overlay: Overlay; show: boolean }) {
  const o = overlays[overlay];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-brand-50 via-canvas to-sun-50">
      <div className="animate-scan absolute inset-x-0 z-10 h-10 bg-gradient-to-b from-transparent via-brand-300/30 to-transparent" />
      <svg viewBox="0 0 200 260" className="mx-auto h-[320px] w-full" role="img" aria-label={`Face map showing ${overlay}`}>
        <defs>
          <filter id="fm-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <linearGradient id="fm-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F6E3D3" />
            <stop offset="100%" stopColor="#EED2BC" />
          </linearGradient>
        </defs>
        <path d="M78 215 L78 245 Q100 252 122 245 L122 215 Z" fill="#E9C9AF" />
        <path d="M30 260 Q40 238 78 236 L122 236 Q160 238 170 260 Z" fill="#24695C" opacity="0.85" />
        <ellipse cx="100" cy="135" rx="68" ry="92" fill="url(#fm-skin)" />
        <path d="M32 120 Q30 40 100 36 Q170 40 168 120 Q160 78 128 66 Q100 82 64 70 Q40 84 32 120 Z" fill="#2B2420" />
        <path d="M62 104 Q74 97 86 103" stroke="#3B2F28" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M114 103 Q126 97 138 104" stroke="#3B2F28" strokeWidth="3" strokeLinecap="round" fill="none" />
        <ellipse cx="74" cy="118" rx="8" ry="4.5" fill="#fff" />
        <ellipse cx="126" cy="118" rx="8" ry="4.5" fill="#fff" />
        <circle cx="74" cy="118" r="3.2" fill="#3B2F28" />
        <circle cx="126" cy="118" r="3.2" fill="#3B2F28" />
        <path d="M100 124 Q97 145 93 152 Q100 157 107 152" stroke="#C9A288" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M84 181 Q100 192 116 181 Q100 186 84 181 Z" fill="#C97B76" />
        <AnimatePresence mode="wait">
          {show && (
            <motion.g
              key={overlay}
              fill={o.color}
              filter="url(#fm-soft)"
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
  );
}
