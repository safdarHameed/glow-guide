"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** White rounded panel used for every content block inside the app. */
export function Card({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // Two Tailwind classes for the same property don't override by order, so only add defaults the caller didn't set.
  const bg = /(^|\s)bg-/.test(className) ? "" : "bg-white";
  const border = /(^|\s)border(-0|-none)?(\s|$)/.test(className) ? "" : "border border-line";
  return (
    <div className={`rounded-3xl p-5 sm:p-6 ${border} ${bg} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function PageHeader({ title, context, actions }: { title: string; context?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-[2.1rem]">{title}</h1>
        {context && <p className="mt-1 text-sm text-muted">{context}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Chip({
  selected,
  onClick,
  children,
  className = "",
}: {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors ${
        selected ? "bg-brand-500 text-white" : "bg-white text-ink-soft ring-1 ring-line hover:ring-brand-300 hover:text-brand-600"
      } ${className}`}
    >
      {children}
    </button>
  );
}

type TagTone = "brand" | "sun" | "sky" | "rose" | "neutral";
const tagTones: Record<TagTone, string> = {
  brand: "bg-brand-50 text-brand-600",
  sun: "bg-sun-50 text-sun-700",
  sky: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-600",
  neutral: "bg-canvas text-ink-soft",
};

export function Tag({ tone = "neutral", children, className = "" }: { tone?: TagTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tagTones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-brand-500" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

/** Click-to-open menu; closes on outside click or Esc. */
export function Popover({
  trigger,
  children,
  align = "right",
  side = "bottom",
  className = "",
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  side?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={`absolute z-50 min-w-56 ${side === "top" ? "bottom-full mb-2" : "top-full mt-2"} rounded-2xl border border-line bg-white p-1.5 shadow-[0_20px_50px_-20px_rgba(23,38,42,0.35)] ${
            align === "right" ? "right-0" : "left-0"
          } ${className}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ onClick, children, danger }: { onClick?: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
        danger ? "text-rose-600 hover:bg-rose-50" : "text-ink-soft hover:bg-canvas hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: React.ComponentType<{ size?: number }>; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
        <Icon size={26} />
      </span>
      <p className="mt-4 text-lg font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Named steps that tick off for long tasks (blueprint rule P). */
export function StepProgress({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={s} className={`flex items-center gap-3 text-sm ${i <= active ? "text-ink" : "text-muted"}`}>
          <span
            className={`grid h-6 w-6 place-items-center rounded-full text-xs ${
              i < active ? "bg-brand-500 text-white" : i === active ? "bg-brand-50 text-brand-500" : "bg-canvas"
            }`}
          >
            {i < active ? "✓" : i === active ? <Loader2 size={13} className="animate-spin" /> : i + 1}
          </span>
          {s}
        </li>
      ))}
    </ol>
  );
}

/** One-line medical safety note for report, plan and product pages (blueprint rule M). */
export function SafetyNote({ children }: { children?: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-sun-50 px-4 py-2.5 text-xs text-sun-700">
      {children ?? "Cosmetic guidance only, not a medical diagnosis. See a dermatologist for persistent or painful conditions."}
    </p>
  );
}
