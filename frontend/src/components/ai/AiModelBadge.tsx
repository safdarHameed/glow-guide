"use client";

import { AlertTriangle, KeyRound, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Popover, Tag } from "@/components/ui/Kit";
import { AI_SETTINGS_HREF, modelLabel, resetTime, type AiStatus } from "@/lib/ai";
import { useAiStatus } from "./AiStatusProvider";

/** Top-bar chip that always shows which AI model answers, with free usage and a way to connect another. */
export function AiModelBadge() {
  const { status } = useAiStatus();
  if (!status) return null;
  const { active, free } = status;
  const isFree = active?.tier === "free";
  const exhausted = isFree && free.remaining === 0;
  const warn = !active || exhausted || active.needsReconnect;
  const label = !active ? "AI off" : isFree ? "Free AI" : modelLabel(active.model);

  return (
    <Popover
      className="w-80 p-0"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          aria-label={`AI model: ${active ? `${active.providerName}, ${active.model}` : "not set up"}. Details`}
          className={`flex max-w-44 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
            warn
              ? "border-rose-100 bg-rose-50 text-rose-600 hover:border-rose-300"
              : isFree
                ? "border-sun-200 bg-sun-50 text-sun-700 hover:border-sun-300"
                : "border-brand-200 bg-brand-50 text-brand-700 hover:border-brand-300"
          }`}
        >
          {warn ? <AlertTriangle size={15} /> : <Sparkles size={15} />}
          <span className="hidden truncate sm:inline">{label}</span>
        </button>
      )}
    >
      {(close) => <AiModelDetails status={status} onNavigate={close} />}
    </Popover>
  );
}

export function AiModelDetails({ status, onNavigate }: { status: AiStatus; onNavigate?: () => void }) {
  const { active, free } = status;
  const isFree = active?.tier === "free";

  return (
    <div className="p-4">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">Active AI model</p>
      {active ? (
        <div className="mt-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{active.providerName}</p>
            {isFree ? <Tag tone="sun">Free</Tag> : <Tag tone="brand">Your key</Tag>}
          </div>
          <p className="mt-0.5 text-sm text-ink-soft">
            {modelLabel(active.model)} <span className="text-muted">· {active.model}</span>
          </p>
          {active.keyHint && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <KeyRound size={12} /> Key ending in {active.keyHint}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">AI isn&apos;t set up. Connect a model to search products and build plans.</p>
      )}

      {active?.needsReconnect && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
          Your saved key can&apos;t be used any more. Please reconnect your model.
        </p>
      )}

      {isFree && <FreeUsage free={free} />}

      <ButtonLink href={AI_SETTINGS_HREF} onClick={onNavigate} size="sm" variant={isFree ? "primary" : "secondary"} className="mt-4 w-full">
        {isFree || !active ? "Connect your own model" : "Manage AI model"}
      </ButtonLink>
    </div>
  );
}

export function FreeUsage({ free }: { free: AiStatus["free"] }) {
  const pct = free.limit ? Math.min(100, (free.used / free.limit) * 100) : 100;
  const exhausted = free.remaining === 0;
  return (
    <div className="mt-3 space-y-2">
      <p className="rounded-xl bg-sun-50 px-3 py-2 text-xs leading-relaxed text-sun-700">
        The free model is lighter and shared, so results can be less accurate and slower than with a model you connect.
      </p>
      <div>
        <div className="flex justify-between text-xs">
          <span className="text-ink-soft">Free requests today</span>
          <span className={exhausted ? "font-semibold text-rose-600" : "text-ink-soft"}>
            {free.used} of {free.limit}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas">
          <div className={`h-full rounded-full ${exhausted ? "bg-rose-500" : "bg-sun-500"}`} style={{ width: `${pct}%` }} />
        </div>
        {exhausted && (
          <p className="mt-1.5 text-xs text-rose-600">Daily limit reached. Resets at {resetTime(free.resetsAt)}.</p>
        )}
      </div>
    </div>
  );
}
