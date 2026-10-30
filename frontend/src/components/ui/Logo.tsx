import Link from "next/link";
import { useId } from "react";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  // Unique gradient ids per instance: a duplicate id inside a hidden element would blank out visible copies.
  const id = useId();
  const drop = `${id}-drop`;
  const sun = `${id}-sun`;
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={drop} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3F927D" />
          <stop offset="100%" stopColor="#17463E" />
        </linearGradient>
        <linearGradient id={sun} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ECAE67" />
          <stop offset="100%" stopColor="#D9822F" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${drop})`} />
      <circle cx="28" cy="12" r="5" fill={`url(#${sun})`} />
      <path
        d="M18 9c4.5 5.4 7.5 9.6 7.5 13.5a7.5 7.5 0 0 1-15 0C10.5 18.6 13.5 14.4 18 9z"
        fill="#fff"
        fillOpacity="0.95"
      />
      <path d="M15 23.5a3.4 3.4 0 0 0 3.4 3.3" stroke="#24695C" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="GlowGuide home">
      <LogoMark className="h-9 w-9 transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105" />
      <span className={`text-lg font-semibold tracking-tight ${light ? "text-white" : "text-ink"}`}>
        Glow<span className={light ? "text-brand-200" : "text-brand-500"}>Guide</span>
      </span>
    </Link>
  );
}
