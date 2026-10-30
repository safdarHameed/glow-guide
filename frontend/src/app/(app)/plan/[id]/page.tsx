"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Moon, RefreshCw, ScanFace, Share2, ShoppingCart, Sun } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { cheapestOffer, PlanStepRow, swapOptions } from "@/components/plan/PlanStepRow";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState, PageHeader, SafetyNote, StepProgress } from "@/components/ui/Kit";
import { Modal } from "@/components/ui/Overlay";
import { useHasScan } from "@/lib/flags";
import { defaultPlan, formatPrice, latestScan, lowestPrice, productById, type Plan, type PlanStep, type Product } from "@/lib/mock-data";

export default function PlanPage() {
  return (
    <Suspense>
      <PlanScreen />
    </Suspense>
  );
}

/** Unique products across both routines; a product used morning and night is bought once. */
function uniqueProducts(plan: Plan, owned: boolean) {
  const ids = new Set([...plan.morning, ...plan.evening].filter((s) => Boolean(s.owned) === owned).map((s) => s.productId));
  return [...ids].map(productById).filter((p): p is Product => Boolean(p));
}

function PlanScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const hasScan = useHasScan();
  const { city, plan, setPlan, addToPlan, profile, setPlanOutdated } = useAppState();
  const highlight = params.get("highlight")?.toLowerCase() ?? null;

  const [tab, setTab] = useState<"morning" | "evening">("morning");
  const [edited, setEdited] = useState(false);
  const [keepAsk, setKeepAsk] = useState(false);
  const [regenStep, setRegenStep] = useState<number | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [planName, setPlanName] = useState(`${city.name} · Oct 28`);
  const [buyOpen, setBuyOpen] = useState(false);

  const budget = profile.budgetMax;
  const toBuy = uniqueProducts(plan, false);
  const owned = uniqueProducts(plan, true);
  const total = toBuy.reduce((sum, p) => sum + lowestPrice(p), 0);
  const ownedSavings = owned.reduce((sum, p) => sum + lowestPrice(p), 0);
  const pct = Math.round((total / budget) * 100);
  const over = total > budget;
  const hasBha = plan.evening.some((s) => s.productId === "paulas-bha");

  const regenSteps = ["Reading your skin", `Checking ${city.name} weather`, `Searching ${city.stores.length} stores`, "Ranking 38 products", "Writing reasons"];

  useEffect(() => setPlanName(`${city.name} · Oct 28`), [city.name]);

  // Open the right tab and scroll to a step linked from Environment (?highlight=sunscreen).
  useEffect(() => {
    if (!highlight || !hasScan) return;
    const inEvening = !plan.morning.some((s) => s.category.toLowerCase().includes(highlight));
    if (inEvening) setTab("evening");
    const el = document.querySelector(`[id^="step-"][id*="${highlight}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight, hasScan, plan.morning]);

  const cheaperSwaps = useMemo(
    () =>
      [...plan.morning, ...plan.evening]
        .filter((s) => !s.owned)
        .map((s) => {
          const current = productById(s.productId);
          const cheaper = swapOptions(s).find((o) => o.label === "Cheaper");
          return current && cheaper ? { step: s, from: current, to: cheaper.product, saves: lowestPrice(current) - lowestPrice(cheaper.product) } : null;
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x)),
    [plan],
  );

  function swap(step: PlanStep, product: Product) {
    const replace = (steps: PlanStep[]) =>
      steps.map((s) => (s.productId === step.productId && s.category === step.category ? { ...s, productId: product.id, owned: false, reason: `Swapped by you · ${product.why[0]}` } : s));
    setPlan({ morning: replace(plan.morning), evening: replace(plan.evening) });
    setEdited(true);
    toast(`Swapped to ${product.brand}. Total updated.`);
  }

  function applyCheaperSwaps() {
    let next = plan;
    for (const { step, to } of cheaperSwaps) {
      const replace = (steps: PlanStep[]) => steps.map((s) => (s.id === step.id ? { ...s, productId: to.id, reason: `Cheaper match · ${to.why[0]}` } : s));
      next = { morning: replace(next.morning), evening: replace(next.evening) };
    }
    setPlan(next);
    setEdited(true);
    toast("Applied cheaper swaps");
  }

  function regenerate(keepChanges: boolean) {
    setKeepAsk(false);
    setRegenStep(0);
    regenSteps.forEach((_, i) => setTimeout(() => setRegenStep(i + 1), (i + 1) * 550));
    setTimeout(() => {
      if (!keepChanges) {
        setPlan(defaultPlan);
        setEdited(false);
      }
      setRegenStep(null);
      setPlanOutdated(false);
      toast(`Plan rebuilt with today's ${city.name} weather and fresh prices`);
    }, regenSteps.length * 550 + 400);
  }

  if (hasScan === null) {
    return <div className="h-96 animate-pulse rounded-3xl bg-white" />;
  }

  if (!hasScan) {
    return (
      <>
        <PageHeader title="My plan" context={`For ${city.name}`} />
        <EmptyState
          icon={ScanFace}
          title="Scan your skin to unlock your plan"
          body={`A 20-second selfie lets us match products to your skin and today's weather in ${city.name}.`}
          action={<ButtonLink href="/scan">Start scan</ButtonLink>}
        />
      </>
    );
  }

  const contextTags: { label: string; href: string; tone: string }[] = [
    { label: "Oily T-zone", href: "/report/latest", tone: "bg-rose-50 text-rose-600" },
    { label: "Large pores", href: "/report/latest", tone: "bg-rose-50 text-rose-600" },
    { label: `UV ${city.uv}`, href: "/environment", tone: "bg-sun-50 text-sun-700" },
    ...(city.aqi !== null ? [{ label: `AQI ${city.aqi}`, href: "/environment", tone: "bg-sun-50 text-sun-700" }] : []),
    { label: `Humid ${city.humidity}%`, href: "/environment", tone: "bg-sky-50 text-sky-600" },
    { label: `Budget ${formatPrice(budget, city.currency)}`, href: "/settings?section=budget", tone: "bg-brand-50 text-brand-600" },
    ...profile.avoid.map((a) => ({ label: `No ${a.toLowerCase()}`, href: "/settings?section=skin", tone: "bg-canvas text-ink-soft" })),
  ];

  const column = (when: "morning" | "evening") => {
    const steps = plan[when];
    return (
      <Card className={`${tab === when ? "" : "hidden"} lg:block`}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            {when === "morning" ? <Sun size={18} className="text-sun-500" /> : <Moon size={18} className="text-sky-500" />}
            {when === "morning" ? "Morning" : "Evening"}
          </h2>
          <span className="text-xs text-muted">{steps.length} steps</span>
        </div>
        <ol className="mt-3 space-y-1">
          {steps.map((s, i) => (
            <PlanStepRow key={s.id} step={s} index={i} onSwap={swap} highlighted={Boolean(highlight && s.category.toLowerCase().includes(highlight))} />
          ))}
        </ol>
        {when === "evening" && !hasBha && (
          <div className="mt-3 rounded-2xl border border-dashed border-sun-300 bg-sun-50/60 p-3 text-sm text-ink-soft">
            Twice a week: a BHA exfoliant for pores. Not added because it is over budget.{" "}
            <button
              onClick={() => {
                addToPlan("paulas-bha", "Exfoliant", "evening");
                setEdited(true);
                toast("Added to evening routine");
              }}
              className="font-semibold text-brand-600 hover:underline"
            >
              Add anyway
            </button>
          </div>
        )}
      </Card>
    );
  };

  const costCard = (
    <Card>
      <p className="text-sm text-muted">Cost of this plan</p>
      <p className="mt-1 text-3xl font-semibold text-ink">{formatPrice(total, city.currency)}</p>
      <p className={`mt-1 text-sm ${over ? "font-medium text-rose-600" : "text-muted"}`}>
        {over ? `${formatPrice(total - budget, city.currency)} over your ${formatPrice(budget, city.currency)} budget` : `${pct}% of your ${formatPrice(budget, city.currency)} budget`}
      </p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full transition-all ${over ? "bg-rose-500" : "bg-brand-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      {over && cheaperSwaps.length > 0 && (
        <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm">
          <p className="font-medium text-rose-600">Cheapest swaps that fit</p>
          <ul className="mt-1 space-y-0.5 text-xs text-ink-soft">
            {cheaperSwaps.map((c) => (
              <li key={c.step.id}>
                {c.from.brand} → {c.to.brand} (saves {formatPrice(c.saves, city.currency)})
              </li>
            ))}
          </ul>
          <Button size="sm" className="mt-2" onClick={applyCheaperSwaps}>
            Apply cheaper swaps
          </Button>
        </div>
      )}
      {ownedSavings > 0 && (
        <p className="mt-4 text-sm text-brand-600">Reusing what you own saves about {formatPrice(ownedSavings, city.currency)}.</p>
      )}
      <Button className="mt-4 w-full" onClick={() => setBuyOpen(true)}>
        <ShoppingCart size={16} /> Buy all ({new Set(toBuy.map((p) => cheapestOffer(p).store)).size} stores)
      </Button>
    </Card>
  );

  const byStore = toBuy.reduce<Record<string, Product[]>>((acc, p) => {
    const s = cheapestOffer(p).store;
    (acc[s] ??= []).push(p);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="My plan"
        context={`For ${city.name} · built from your scan of ${latestScan.date}`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => (edited ? setKeepAsk(true) : regenerate(false))} disabled={regenStep !== null}>
              <RefreshCw size={15} /> Regenerate
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(window.location.href);
                toast("Read-only link copied");
              }}
            >
              <Share2 size={15} /> Share
            </Button>
            <Button size="sm" onClick={() => setSaveOpen(true)}>
              Save plan
            </Button>
          </>
        }
      />

      <SafetyNote>Cosmetic suggestions only. Patch-test new products.</SafetyNote>

      <div className="mt-4 flex flex-wrap gap-2">
        {contextTags.map((t) => (
          <Link key={t.label} href={t.href} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 ${t.tone}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {regenStep !== null && (
        <Card className="mt-5">
          <p className="mb-4 font-semibold text-ink">Rebuilding your plan…</p>
          <StepProgress steps={regenSteps} active={regenStep} />
        </Card>
      )}

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-white p-1 ring-1 ring-line lg:hidden">
        {(["morning", "evening"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full py-2 text-sm font-medium ${tab === t ? "bg-brand-500 text-white" : "text-muted"}`}>
            {t === "morning" ? `Morning · ${plan.morning.length}` : `Evening · ${plan.evening.length}`}
          </button>
        ))}
      </div>

      <div className={`mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] ${regenStep !== null ? "pointer-events-none opacity-50" : ""}`}>
        <div className="grid gap-5 xl:grid-cols-2">
          {column("morning")}
          {column("evening")}
        </div>
        <div className="hidden space-y-5 lg:block">
          <div className="sticky top-24 space-y-5">
            {costCard}
            <HowToUse />
          </div>
        </div>
      </div>

      <div className="mt-5 lg:hidden">
        <HowToUse />
      </div>

      {/* Phone/tablet: cost as a sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-[61px] z-20 flex items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-20 lg:hidden">
        <div>
          <p className="text-base font-semibold text-ink">{formatPrice(total, city.currency)}</p>
          <p className={`text-xs ${over ? "text-rose-600" : "text-muted"}`}>{over ? "Over budget" : `${pct}% of budget`}</p>
        </div>
        <Button size="sm" onClick={() => setBuyOpen(true)}>
          <ShoppingCart size={15} /> Buy all
        </Button>
      </div>

      <Modal
        open={keepAsk}
        onClose={() => setKeepAsk(false)}
        title="Keep my changes?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => regenerate(false)}>
              Start fresh
            </Button>
            <Button onClick={() => regenerate(true)}>Keep my changes</Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">You swapped some products. We can rebuild around them, or start fresh with today&apos;s weather and prices.</p>
      </Modal>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save plan"
        size="sm"
        footer={
          <Button
            disabled={!planName.trim()}
            onClick={() => {
              setSaveOpen(false);
              toast(`Saved "${planName.trim()}"`, { label: "View", onClick: () => router.push("/saved") });
            }}
          >
            Save plan
          </Button>
        }
      >
        <label className="block text-sm font-medium text-ink" htmlFor="plan-name">
          Plan name
        </label>
        <input
          id="plan-name"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          autoFocus
          className="mt-1.5 h-12 w-full rounded-xl border border-line px-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        />
        <p className="mt-2 text-xs text-muted">Saved plans appear in Saved, where you can share a read-only link.</p>
      </Modal>

      <Modal open={buyOpen} onClose={() => setBuyOpen(false)} title={`Buy all (${Object.keys(byStore).length} stores)`}>
        <div className="space-y-4">
          {Object.entries(byStore).map(([store, items]) => (
            <div key={store} className="rounded-2xl border border-line p-4">
              <p className="text-sm font-semibold text-ink">{store}</p>
              <ul className="mt-2 space-y-2">
                {items.map((p) => {
                  const offer = cheapestOffer(p);
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-ink-soft">
                        {p.brand} {p.name}
                      </span>
                      <a
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center gap-1 font-medium text-brand-600 hover:underline"
                      >
                        {offer.verified ? "" : "≈ "}
                        {formatPrice(offer.price, city.currency)} <ExternalLink size={13} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="text-xs text-muted">Each link opens the store in a new tab. GlowGuide doesn&apos;t handle payment.</p>
        </div>
      </Modal>
    </>
  );
}

function HowToUse() {
  return (
    <Card>
      <p className="font-semibold text-ink">How to use</p>
      <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
        <li>Wait 1 minute between serum and moisturizer.</li>
        <li>Use 2 finger-lengths of sunscreen for face and neck.</li>
        <li>Reapply sunscreen around 1 pm when outdoors.</li>
      </ul>
    </Card>
  );
}
