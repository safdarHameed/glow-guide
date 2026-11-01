"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Droplets,
  ImageUp,
  Plane,
  ScanFace,
  Sun,
  UserRoundPen,
  Wind,
} from "lucide-react";
import { Suspense } from "react";
import { ProductThumb } from "@/components/app/ProductThumb";
import { useProductLink } from "@/components/app/useProductLink";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useUser } from "@/components/providers/AuthProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader, Tag } from "@/components/ui/Kit";
import { ScoreRing } from "@/components/ui/Motion";
import { glowApi, message } from "@/lib/glow-api";
import { useHasScan, useOnboardingState } from "@/lib/flags";
import { aqiLabel, uvLabel, type City, type PlanStep } from "@/lib/domain";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function todaysTip(city: City) {
  const parts: string[] = [];
  if (city.uv >= 6) parts.push("reapply sunscreen around 1 pm");
  else parts.push("an everyday SPF 30 is enough today");
  if (city.aqi !== null && city.aqi >= 100)
    parts.push("double-cleanse tonight because of the smog");
  else if (city.humidity <= 40)
    parts.push("add a hydrating layer for the dry air");
  return `Today's tip: ${parts.join(", and ")}.`;
}

export default function DashboardPage() {
  const user = useUser();
  const { city, planOutdated, environment, environmentError, planRecord } =
    useAppState();
  const hasScan = useHasScan();
  const onboarding = useOnboardingState();
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title="Home"
        context={`${greeting()}, ${firstName}. Here's what today means for your skin.`}
      />

      {onboarding === "skipped" && (
        <Link
          href="/onboarding"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-600 hover:border-sky-300"
        >
          <UserRoundPen size={18} className="shrink-0" />
          <span className="flex-1">
            Finish your profile so we can match your goals, avoid list and
            budget.
          </span>
          <ArrowRight size={16} />
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {environment ? (
          <WeatherCard city={city} />
        ) : (
          <Card className="lg:col-span-2">
            <h2 className="font-semibold text-ink">
              {city.id ? "Weather unavailable" : "Choose your city"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {environmentError ||
                "Use the location chip to choose a city for weather and local stores."}
            </p>
            <ButtonLink className="mt-4" href="/onboarding">
              Choose city
            </ButtonLink>
          </Card>
        )}

        {hasScan === null ? (
          <div className="h-72 animate-pulse rounded-3xl bg-white lg:col-span-1" />
        ) : hasScan ? (
          <SkinCard />
        ) : (
          <ScanPrompt cityName={city.name} />
        )}

        {hasScan && (
          <div className="space-y-6 lg:col-span-2">
            {planOutdated && <UpdatePlanBanner />}
            {planRecord ? (
              <PlanCard />
            ) : (
              <Card>
                <p className="text-sm text-muted">
                  Build your routine from your skin report.
                </p>
                <ButtonLink className="mt-3" href="/report/latest">
                  Open report
                </ButtonLink>
              </Card>
            )}
          </div>
        )}

        <div
          className={`space-y-6 ${hasScan ? "" : "lg:col-span-3 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0"}`}
        >
          <TripCard />
          <Suspense
            fallback={
              <div className="h-40 animate-pulse rounded-3xl bg-white" />
            }
          >
            <SavedProducts />
          </Suspense>
        </div>
      </div>
    </>
  );
}

function WeatherCard({ city }: { city: City }) {
  const aqi = aqiLabel(city.aqi);
  return (
    <Card className="relative overflow-hidden border-0 bg-ink text-white lg:col-span-2">
      <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-white/70">
            Today in {city.name} · Open-Meteo
          </p>
          <Link
            href="/environment"
            className="flex items-center gap-1 text-sm font-medium text-sun-300 hover:underline"
          >
            View environment <ArrowRight size={15} />
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-5">
          <div>
            <p className="text-6xl font-semibold">{city.temp}°</p>
            <p className="text-sm text-white/60">
              Feels like {city.feelsLike}°
            </p>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-2">
            <Stat
              icon={Sun}
              cls="text-sun-300"
              label="UV index"
              value={String(city.uv)}
              sub={uvLabel(city.uv)}
            />
            <Stat
              icon={Droplets}
              cls="text-sky-300"
              label="Humidity"
              value={`${city.humidity}%`}
              sub={
                city.humidity >= 60
                  ? "humid"
                  : city.humidity <= 40
                    ? "dry"
                    : "comfortable"
              }
            />
            {city.aqi === null ? (
              <div className="rounded-2xl bg-white/[0.07] p-3 text-xs text-white/60 ring-1 ring-white/10">
                <Wind size={16} className="mb-1.5 text-rose-300" />
                Air quality not available here
              </div>
            ) : (
              <Stat
                icon={Wind}
                cls="text-rose-300"
                label="Air quality"
                value={String(city.aqi)}
                sub={aqi.label}
              />
            )}
          </div>
        </div>
        <p className="mt-5 rounded-2xl bg-white/[0.07] px-4 py-3 text-sm text-white/85 ring-1 ring-white/10">
          {todaysTip(city)}
        </p>
      </div>
    </Card>
  );
}

function Stat({
  icon: Icon,
  cls,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  cls: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10">
      <Icon size={16} className={cls} />
      <p className="mt-1.5 text-[11px] text-white/55">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-white/60">{sub}</p>
    </div>
  );
}

function SkinCard() {
  const { latestScan } = useAppState();
  if (!latestScan) return null;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Your skin</h2>
        <span className="text-xs text-muted">{latestScan.date}</span>
      </div>
      <div className="mt-5 flex items-center gap-5">
        <ScoreRing score={latestScan.overall} size={96} />
        <div>
          <p className="text-lg font-semibold text-ink">
            {latestScan.skinType} skin
          </p>
          <p className="mt-2 text-xs text-muted">Top concerns</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {latestScan.priorities.map((p) => (
              <Tag key={p} tone="sun">
                {p}
              </Tag>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <ButtonLink href="/report/latest" size="sm">
          View report
        </ButtonLink>
        <ButtonLink href="/scan" variant="secondary" size="sm">
          Scan again
        </ButtonLink>
      </div>
    </Card>
  );
}

function ScanPrompt({ cityName }: { cityName: string }) {
  return (
    <Card className="flex flex-col justify-center bg-gradient-to-br from-brand-50 to-white">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-white">
        <ScanFace size={26} />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-ink">
        Scan your skin to unlock your plan
      </h2>
      <p className="mt-2 text-sm text-muted">
        A 20-second selfie lets us match products to your skin and today&apos;s
        weather in {cityName}.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <ButtonLink href="/scan">Start scan</ButtonLink>
        <ButtonLink href="/scan" variant="secondary">
          <ImageUp size={16} /> Upload a photo
        </ButtonLink>
      </div>
    </Card>
  );
}

function UpdatePlanBanner() {
  const router = useRouter();
  const { city, adoptPlan } = useAppState();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sun-200 bg-sun-50 px-4 py-3">
      <AlertTriangle size={18} className="shrink-0 text-sun-600" />
      <p className="flex-1 text-sm text-sun-700">
        Your city, preferences or conditions changed since this plan was made.
      </p>
      <Button
        size="sm"
        onClick={async () => {
          try {
            adoptPlan(await glowApi.buildPlan(city));
            router.push("/plan/current");
          } catch (err) {
            window.alert(message(err));
          }
        }}
      >
        Update plan
      </Button>
    </div>
  );
}

function PlanCard() {
  const { plan, city } = useAppState();
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">
          Your plan for {city.name}
        </h2>
        <ButtonLink href="/plan/current" size="sm" variant="secondary">
          Open plan
        </ButtonLink>
      </div>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <StepList title="Morning" steps={plan.morning} />
        <StepList title="Evening" steps={plan.evening} />
      </div>
    </Card>
  );
}

function StepList({ title, steps }: { title: string; steps: PlanStep[] }) {
  const { productById } = useAppState();
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        {title} · {steps.length} steps
      </p>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => {
          const p = productById(s.productId);
          return (
            <li key={s.id} className="flex items-center gap-3 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink">
                {s.category}
                {p && <span className="text-muted"> · {p.brand}</span>}
              </span>
              {s.owned && <Tag tone="brand">owned</Tag>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TripCard() {
  return (
    <Card className="bg-gradient-to-br from-sky-50 to-white">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-500 text-white">
        <Plane size={20} />
      </span>
      <h2 className="mt-4 text-base font-semibold text-ink">
        Travelling soon?
      </h2>
      <p className="mt-1 text-sm text-muted">
        Get a routine for your destination&apos;s climate.
      </p>
      <ButtonLink href="/trip" size="sm" variant="secondary" className="mt-4">
        Plan a trip
      </ButtonLink>
    </Card>
  );
}

function SavedProducts() {
  const { wishlist, productById } = useAppState();
  const productLink = useProductLink();
  const items = wishlist.map(productById).filter((p) => p !== undefined);
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Saved products</h2>
        <Link
          href="/saved?tab=wishlist"
          className="text-xs text-muted hover:text-brand-600"
        >
          {items.length} items
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Tap the heart on any product to save it here.{" "}
          <Link
            href="/products"
            className="font-medium text-brand-600 hover:underline"
          >
            Browse products
          </Link>
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {items.map((p) => (
            <Link
              key={p.id}
              href={productLink(p.id)}
              scroll={false}
              title={`${p.brand} ${p.name}`}
              className="rounded-2xl transition-transform hover:-translate-y-0.5"
            >
              <ProductThumb category={p.category} size={60} />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
