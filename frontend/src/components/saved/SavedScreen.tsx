"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Bookmark, Heart, ScanFace } from "lucide-react";
import { CitySearch } from "@/components/onboarding/ProfilePickers";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ProductCard } from "@/components/products/ProductCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState, PageHeader, Tag } from "@/components/ui/Kit";
import { ConfirmDialog, Modal } from "@/components/ui/Overlay";
import { glowApi, message } from "@/lib/glow-api";
import { formatPrice, type PlanRecord } from "@/lib/domain";

export function SavedScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const {
    savedPlans,
    scanHistory,
    wishlist,
    productById,
    refreshPlans,
    reload,
    profile,
  } = useAppState();
  const tab = params.get("tab") ?? "plans";
  const [renaming, setRenaming] = useState<PlanRecord | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<PlanRecord | null>(null);
  const [duplicating, setDuplicating] = useState<PlanRecord | null>(null);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [busy, setBusy] = useState(false);
  const first = scanHistory.find((s) => s.id === a) ?? scanHistory.at(-2);
  const second = scanHistory.find((s) => s.id === b) ?? scanHistory.at(-1);
  async function action(work: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await work();
      await refreshPlans();
      toast(success);
    } catch (err) {
      toast(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader title="Saved" context="Plans, scan history and wishlist" />
      <div
        role="tablist"
        className="mb-6 inline-flex gap-1 rounded-full border border-line bg-white p-1"
      >
        {[
          ["plans", savedPlans.length],
          ["scans", scanHistory.length],
          ["wishlist", wishlist.length],
        ].map(([id, count]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => router.replace(`/saved?tab=${id}`)}
            className={`rounded-full px-4 py-2 text-sm capitalize ${tab === id ? "bg-brand-500 text-white" : "text-muted"}`}
          >
            {id} ({count})
          </button>
        ))}
      </div>
      {tab === "plans" &&
        (savedPlans.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {savedPlans.map((plan) => {
              const status = plan.trip
                ? plan.trip.end < new Date().toISOString().slice(0, 10)
                  ? "Past trip"
                  : "Upcoming trip"
                : plan.isCurrent
                  ? "Current"
                  : "Archived";
              return (
                <Card key={plan.id}>
                  <Link
                    href={
                      plan.trip ? `/trip?plan=${plan.id}` : `/plan/${plan.id}`
                    }
                    className="text-lg font-semibold text-ink hover:text-brand-600"
                  >
                    {plan.name}
                  </Link>
                  <p className="mt-2 text-sm text-muted">
                    {plan.morning.length + plan.evening.length} steps ·{" "}
                    {formatPrice(plan.total, plan.city.currency)}
                    {plan.scanDeleted ? " · scan deleted" : ""}
                  </p>
                  <Tag
                    className="mt-3"
                    tone={plan.isCurrent ? "brand" : "neutral"}
                  >
                    {status}
                  </Tag>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!plan.isCurrent && !plan.trip && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void action(async () => {
                            await glowApi.updatePlan(plan.id, {
                              isCurrent: true,
                            });
                            await reload();
                          }, "Current plan updated")
                        }
                      >
                        Set as current
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setName(plan.name);
                        setRenaming(plan);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDuplicating(plan)}
                    >
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleting(plan)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Bookmark}
            title="No saved plans yet"
            body="Build a routine from your skin report, then save it."
            action={<ButtonLink href="/report/latest">Open report</ButtonLink>}
          />
        ))}
      {tab === "wishlist" &&
        (wishlist.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {wishlist.map((id) => {
              const p = productById(id);
              return p ? <ProductCard key={id} product={p} /> : null;
            })}
          </div>
        ) : (
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            body="Tap a heart on a product to save it."
            action={<ButtonLink href="/products">Browse products</ButtonLink>}
          />
        ))}
      {tab === "scans" &&
        (scanHistory.length ? (
          <div className="space-y-6">
            {!profile.keepScanHistory && (
              <p className="rounded-2xl bg-sun-50 p-4 text-sm text-sun-700">
                New reports are excluded from history while scan history is off.
              </p>
            )}
            <Card>
              <h2 className="font-semibold text-ink">Skin score over time</h2>
              <svg
                viewBox="0 0 640 200"
                className="mt-4 w-full"
                aria-label="Skin score over time"
                role="img"
              >
                {[0, 50, 100].map((score) => (
                  <g key={score}>
                    <line
                      x1="35"
                      x2="620"
                      y1={170 - score * 1.4}
                      y2={170 - score * 1.4}
                      stroke="#E1E7E5"
                    />
                    <text x="5" y={174 - score * 1.4} fontSize="11">
                      {score}
                    </text>
                  </g>
                ))}
                <polyline
                  points={scanHistory
                    .map(
                      (s, i) =>
                        `${40 + (i * 560) / Math.max(1, scanHistory.length - 1)},${170 - s.overall * 1.4}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke="#24695C"
                  strokeWidth="3"
                />
                {scanHistory.map((s, i) => (
                  <g
                    key={s.id}
                    onClick={() => router.push(`/report/${s.id}`)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={40 + (i * 560) / Math.max(1, scanHistory.length - 1)}
                      cy={170 - s.overall * 1.4}
                      r="6"
                      fill="#24695C"
                    />
                    <text
                      x={40 + (i * 560) / Math.max(1, scanHistory.length - 1)}
                      y="195"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {s.date}
                    </text>
                  </g>
                ))}
              </svg>
            </Card>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <h2 className="font-semibold text-ink">History</h2>
                {[...scanHistory].reverse().map((s) => (
                  <Link
                    key={s.id}
                    href={`/report/${s.id}`}
                    className="flex justify-between border-b border-line py-4 text-sm"
                  >
                    <span>
                      {s.date} · {s.city}
                    </span>
                    <strong>{s.overall}</strong>
                  </Link>
                ))}
              </Card>
              <Card>
                <h2 className="font-semibold text-ink">Compare two scans</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    [first?.id, setA, "First scan"],
                    [second?.id, setB, "Second scan"],
                  ].map(([id, setter, label]) => (
                    <label key={label as string} className="text-xs text-muted">
                      {label as string}
                      <select
                        className="mt-2 h-11 w-full rounded-xl border border-line px-3"
                        value={id as string | undefined}
                        onChange={(e) =>
                          (setter as (id: string) => void)(e.target.value)
                        }
                      >
                        {scanHistory.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.date} · {s.overall}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                {first && second && first.id !== second.id ? (
                  <table className="mt-5 w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted">
                        <th>Measurement</th>
                        <th>Before</th>
                        <th>After</th>
                        <th>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {first.metrics.map((metric) => {
                        const after = second.metrics.find(
                          (m) => m.key === metric.key,
                        )?.value;
                        const delta =
                          after === undefined ? null : after - metric.value;
                        return (
                          <tr key={metric.key} className="border-b border-line">
                            <td className="py-3">{metric.name}</td>
                            <td>{metric.value}</td>
                            <td>{after ?? "—"}</td>
                            <td>
                              {delta === null
                                ? "—"
                                : `${delta >= 0 ? "+" : ""}${delta}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-4 text-sm text-muted">
                    Choose two different scans to compare.
                  </p>
                )}
                <p className="mt-4 text-xs text-muted">
                  Changes are observations, not proof a product worked. Lighting
                  affects results.
                </p>
              </Card>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={ScanFace}
            title="No scan history yet"
            body="Scan regularly in similar light to track progress."
            action={<ButtonLink href="/scan">Start scan</ButtonLink>}
          />
        ))}
      <Modal
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        title="Rename plan"
        size="sm"
        footer={
          <Button
            disabled={busy || !name.trim()}
            onClick={() =>
              void action(async () => {
                await glowApi.updatePlan(renaming!.id, { name: name.trim() });
                setRenaming(null);
              }, "Plan renamed")
            }
          >
            Save name
          </Button>
        }
      >
        <input
          aria-label="Plan name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="h-12 w-full rounded-xl border border-line px-4"
        />
      </Modal>
      <Modal
        open={Boolean(duplicating)}
        onClose={() => setDuplicating(null)}
        title="Duplicate for another city"
      >
        <p className="mb-4 text-sm text-muted">
          Uses your scan and searches products for the new city.
        </p>
        <CitySearch
          onSelect={(city) =>
            void action(async () => {
              await glowApi.duplicate(duplicating!.id, city);
              setDuplicating(null);
            }, "Plan duplicated")
          }
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this plan?"
        body="This removes the plan. Your scans and wishlist stay."
        destructive
        confirmLabel="Delete plan"
        onConfirm={() =>
          void action(async () => {
            await glowApi.deletePlan(deleting!.id);
            setDeleting(null);
            await reload();
          }, "Plan deleted")
        }
      />
    </>
  );
}
