"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Droplets,
  MapPin,
  Plane,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { useState } from "react";
import { CityPicker } from "@/components/app/CityPicker";
import {
  explainers,
  type MetricKey,
} from "@/components/environment/explainers";
import { useAppState } from "@/components/providers/AppStateProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader, Tag } from "@/components/ui/Kit";
import { Modal } from "@/components/ui/Overlay";
import { aqiLabel, uvLabel, skinAdvice } from "@/lib/domain";

const humidityLabel = (h: number) =>
  h >= 60 ? "Humid" : h <= 35 ? "Dry" : "Comfortable";
export default function EnvironmentPage() {
  const { city, profile, environment, environmentError, plan } = useAppState();
  const [dayIndex, setDayIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [explainer, setExplainer] = useState<MetricKey | null>(null);
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  const forecast = environment?.forecast ?? [];
  const selectedDay = forecast[dayIndex] ?? forecast[0];
  const day =
    dayIndex === 0 || !selectedDay
      ? city
      : { ...city, ...selectedDay, feelsLike: selectedDay.temp, pm25: null };
  const advice = skinAdvice(
    day,
    profile.skinTypeOverride ?? "",
    [...plan.morning, ...plan.evening].map((s) => s.category),
  );
  const aqi = aqiLabel(day.aqi);
  const fmt = (c: number) =>
    profile.units === "F" ? `${Math.round((c * 9) / 5 + 32)}°F` : `${c}°C`;
  const hourly = selectedDay?.hourly ?? [];
  const peak = Math.max(0, ...hourly.map((h) => h.uv));
  const isPeak = (uv: number) => peak > 0 && uv >= peak - 0.5;
  if (!environment)
    return (
      <>
        <PageHeader
          title="Environment"
          context={environmentError || "Choose a city to see live conditions."}
        />
        <Button onClick={() => setPickerOpen(true)}>Choose city</Button>
        <CityPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      </>
    );
  const cards: {
    key: MetricKey;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    value: string;
    sub: string;
    tone: string;
  }[] = [
    {
      key: "temp",
      label: "Temperature",
      icon: Thermometer,
      value: fmt(day.temp),
      sub: `Feels like ${fmt(day.feelsLike)}`,
      tone: "text-sun-600 bg-sun-50",
    },
    {
      key: "humidity",
      label: "Humidity",
      icon: Droplets,
      value: `${day.humidity}%`,
      sub: humidityLabel(day.humidity),
      tone: "text-sky-600 bg-sky-50",
    },
    {
      key: "uv",
      label: "UV index",
      icon: Sun,
      value: String(day.uv),
      sub: `${uvLabel(day.uv)[0]!.toUpperCase()}${uvLabel(day.uv).slice(1)}`,
      tone: "text-sun-600 bg-sun-50",
    },
    {
      key: "aqi",
      label: "Air quality (AQI)",
      icon: Wind,
      value: day.aqi === null ? "—" : String(day.aqi),
      sub:
        day.aqi === null
          ? "Air quality not available here"
          : `${aqi.label[0]!.toUpperCase()}${aqi.label.slice(1)}${day.pm25 === null ? "" : ` · PM2.5 ${day.pm25}`}`,
      tone: "text-rose-500 bg-rose-50",
    },
  ];

  return (
    <>
      <PageHeader
        title="Environment"
        context={
          <span className="flex flex-wrap items-center gap-x-2">
            <span className="flex items-center gap-1 font-medium text-ink">
              <MapPin size={14} className="text-brand-500" /> {city.name},{" "}
              {city.country}
            </span>
            <span>
              {dayIndex === 0 ? "Now" : "Forecast"} · {selectedDay?.date} ·
              Source: {environment.source} · updated{" "}
              {new Date(environment.updatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </span>
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPickerOpen(true)}
            >
              <MapPin size={15} /> Change city
            </Button>
            <ButtonLink href="/trip" size="sm">
              <Plane size={15} /> Plan a trip
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => setExplainer(c.key)}
            className="group rounded-3xl border border-line bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_20px_40px_-28px_rgba(23,38,42,0.35)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{c.label}</span>
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl ${c.tone}`}
              >
                <c.icon size={18} />
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold text-ink">{c.value}</p>
            <p className="mt-1 text-xs text-muted">{c.sub}</p>
            <p className="mt-3 text-xs font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
              What does this mean?
            </p>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold text-ink">UV through the day</h2>
              <span className="text-xs text-muted">
                Hover or tap a bar for the exact value
              </span>
            </div>
            <div className="relative mt-6 flex h-40 items-end gap-1.5 sm:gap-2">
              {hourly.map((h, i) => (
                <button
                  key={`${h.hour}-${i}`}
                  onMouseEnter={() => setHoverHour(i)}
                  onMouseLeave={() => setHoverHour(null)}
                  onFocus={() => setHoverHour(i)}
                  onClick={() => setHoverHour(hoverHour === i ? null : i)}
                  aria-label={`${h.hour} ${i < 6 ? "am" : "pm"}: UV ${h.uv}`}
                  className="relative flex h-full flex-1 items-end"
                >
                  {hoverHour === i && (
                    <span className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-white">
                      UV {h.uv}
                    </span>
                  )}
                  <span
                    className={`w-full rounded-t-md transition-all ${isPeak(h.uv) ? "bg-sun-500" : h.uv >= 3 ? "bg-sun-300" : "bg-sun-100"} ${
                      hoverHour === i ? "opacity-100 ring-2 ring-ink/20" : ""
                    }`}
                    style={{ height: `${Math.max(4, (h.uv / 12) * 100)}%` }}
                  />
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5 text-center text-[10px] text-muted sm:gap-2">
              {hourly.map((h, i) => (
                <span key={`${h.hour}-l-${i}`} className="flex-1">
                  {h.hour}
                </span>
              ))}
            </div>
            {peak > 0 && (
              <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
                <span className="h-3 w-3 rounded-sm bg-sun-500" /> Highlighted
                bars show the highest UV hours for this date.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold text-ink">5-day forecast</h2>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {forecast.map((f, i) => {
                const d = f;
                return (
                  <button
                    key={f.day}
                    onClick={() => setDayIndex(i)}
                    aria-pressed={dayIndex === i}
                    className={`rounded-2xl p-3 text-center transition-colors ${
                      dayIndex === i
                        ? "bg-brand-500 text-white"
                        : "bg-canvas text-ink hover:bg-brand-50"
                    }`}
                  >
                    <p className="text-xs font-medium opacity-80">{f.day}</p>
                    <p className="mt-1 text-lg font-semibold">{d.temp}°</p>
                    <p className="mt-1 text-[11px] leading-tight opacity-80">
                      UV {d.uv}
                      <br />
                      AQI {d.aqi ?? "—"}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <Card className="h-fit">
          <h2 className="font-semibold text-ink">
            What this means for your skin
          </h2>
          <p className="mt-1 text-xs text-muted">
            Simple rules from today&apos;s numbers, not guesses.
          </p>
          <ul className="mt-5 space-y-3">
            {advice.map((a) => (
              <li key={a.key} className="rounded-2xl bg-canvas p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">{a.title}</p>
                  <Link href={`/plan/current?highlight=${a.step}`}>
                    {a.inPlan ? (
                      <Tag
                        tone="brand"
                        className="hover:ring-1 hover:ring-brand-300"
                      >
                        <CheckCircle2 size={12} /> In your plan
                      </Tag>
                    ) : (
                      <Tag
                        tone="sun"
                        className="hover:ring-1 hover:ring-sun-300"
                      >
                        Not in your plan yet
                      </Tag>
                    )}
                  </Link>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{a.body}</p>
              </li>
            ))}
            {day.aqi === null && (
              <li className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
                Air quality is not available here, so pollution advice is
                skipped.
              </li>
            )}
          </ul>
        </Card>
      </div>

      <CityPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />

      <Modal
        open={explainer !== null}
        onClose={() => setExplainer(null)}
        title={explainer ? explainers[explainer].title : ""}
      >
        {explainer && (
          <div className="space-y-5 text-sm">
            <p className="text-ink-soft">{explainers[explainer].meaning}</p>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                Scale
              </p>
              <ul className="mt-2 space-y-1.5">
                {explainers[explainer].bands.map((b) => (
                  <li
                    key={b.range}
                    className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2"
                  >
                    <span className="text-ink">{b.range}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.tone}`}
                    >
                      {b.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">
                Why it matters for skin
              </p>
              <p className="mt-1 text-ink-soft">{explainers[explainer].skin}</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
