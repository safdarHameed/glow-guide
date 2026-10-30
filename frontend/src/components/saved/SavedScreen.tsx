"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Bookmark, Heart, MoreHorizontal, RefreshCw, ScanFace } from "lucide-react";
import { useState } from "react";
import { CitySearch } from "@/components/onboarding/ProfilePickers";
import { ProductThumb } from "@/components/app/ProductThumb";
import { useProductLink } from "@/components/app/useProductLink";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Card, EmptyState, MenuItem, PageHeader, Popover, Tag } from "@/components/ui/Kit";
import { ConfirmDialog, Modal } from "@/components/ui/Overlay";
import { useHasScan } from "@/lib/flags";
import { formatPrice, latestScan, lowestPrice, productById, savedPlans, scanHistory, type Product } from "@/lib/mock-data";
import { scoreTone } from "@/lib/routes";

type Tab = "plans" | "scans" | "wishlist";
type SavedPlan = (typeof savedPlans)[number];

const statusTone = { Current: "brand", "Upcoming trip": "sky", Archived: "neutral" } as const;
const PRICE_DROP_ID = "paulas-bha";

/** S13: plans per city or trip, scan history with progress, and saved products. */
export function SavedScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { wishlist } = useAppState();
  const tabParam = params.get("tab");
  const tab: Tab = tabParam === "scans" || tabParam === "wishlist" ? tabParam : "plans";
  const [plans, setPlans] = useState<SavedPlan[]>(savedPlans);

  const tabs: { id: Tab; label: string }[] = [
    { id: "plans", label: `Plans (${plans.length})` },
    { id: "scans", label: `Scans (${scanHistory.length})` },
    { id: "wishlist", label: `Wishlist (${wishlist.length})` },
  ];

  return (
    <>
      <PageHeader title="Saved" context="Plans, scan history and wishlist" />
      <div role="tablist" className="mb-6 inline-flex gap-1 rounded-full border border-line bg-white p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => router.replace(`/saved?tab=${t.id}`, { scroll: false })}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? "bg-brand-500 text-white" : "text-ink-soft hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "plans" && <PlansTab plans={plans} setPlans={setPlans} />}
      {tab === "scans" && <ScansTab />}
      {tab === "wishlist" && <WishlistTab />}
    </>
  );
}

function PlansTab({ plans, setPlans }: { plans: SavedPlan[]; setPlans: React.Dispatch<React.SetStateAction<SavedPlan[]>> }) {
  const router = useRouter();
  const toast = useToast();
  const { city } = useAppState();
  const [renaming, setRenaming] = useState<SavedPlan | null>(null);
  const [newName, setNewName] = useState("");
  const [duplicating, setDuplicating] = useState<SavedPlan | null>(null);
  const [deleting, setDeleting] = useState<SavedPlan | null>(null);

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="No saved plans yet"
        body="Build one from your skin report."
        action={
          <>
            <ButtonLink href="/report/latest">Open my report</ButtonLink>
            <ButtonLink href="/scan" variant="secondary">
              Scan my skin
            </ButtonLink>
          </>
        }
      />
    );
  }

  const open = (p: SavedPlan) => router.push(p.status === "Upcoming trip" ? "/trip?to=dubai" : "/plan/current");

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => open(p)} className="text-left">
                <p className="text-lg font-semibold text-ink hover:text-brand-600">{p.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {p.steps} steps · {formatPrice(p.totalPkr, city.currency)} · {p.from}
                </p>
              </button>
              <Popover
                trigger={({ toggle }) => (
                  <button onClick={toggle} aria-label={`Menu for ${p.name}`} className="rounded-full p-2 text-muted hover:bg-canvas">
                    <MoreHorizontal size={18} />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <MenuItem onClick={() => (close(), open(p))}>Open</MenuItem>
                    {p.status !== "Current" && p.status !== "Upcoming trip" && (
                      <MenuItem
                        onClick={() => {
                          close();
                          setPlans((list) =>
                            list.map((x) =>
                              x.id === p.id ? { ...x, status: "Current" } : x.status === "Current" ? { ...x, status: "Archived" } : x,
                            ),
                          );
                          toast(`${p.name} is now your current plan`);
                        }}
                      >
                        Set as current
                      </MenuItem>
                    )}
                    <MenuItem onClick={() => (close(), setNewName(p.name), setRenaming(p))}>Rename</MenuItem>
                    <MenuItem onClick={() => (close(), setDuplicating(p))}>Duplicate for another city</MenuItem>
                    <MenuItem danger onClick={() => (close(), setDeleting(p))}>
                      Delete
                    </MenuItem>
                  </>
                )}
              </Popover>
            </div>
            <div className="mt-4">
              <Tag tone={statusTone[p.status]}>{p.status}</Tag>
            </div>
            {p.status === "Current" && p.weatherChanged && (
              <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-sun-50 px-3 py-2.5 text-sm text-sun-700">
                Air quality changed since saved.
                <button
                  onClick={() => {
                    toast("Refreshing your plan with today's weather");
                    router.push("/plan/current");
                  }}
                  className="flex items-center gap-1 font-semibold hover:underline"
                >
                  <RefreshCw size={13} /> Refresh?
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        title="Rename plan"
        size="sm"
        footer={
          <Button
            disabled={!newName.trim()}
            onClick={() => {
              setPlans((list) => list.map((x) => (x.id === renaming?.id ? { ...x, name: newName.trim() } : x)));
              setRenaming(null);
              toast("Plan renamed");
            }}
          >
            Save name
          </Button>
        }
      >
        <Field label="Plan name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus maxLength={60} />
      </Modal>

      <Modal open={Boolean(duplicating)} onClose={() => setDuplicating(null)} title="Duplicate for another city" size="sm">
        <p className="mb-4 text-sm text-muted">Your skin scan is kept. Weather, stores and prices will come from the new city.</p>
        <CitySearch
          autoFocus
          onSelect={(c) => {
            const source = duplicating!;
            setPlans((list) => [
              ...list,
              { ...source, id: `pl_${c.id}_${Date.now()}`, name: `${c.name} · copy of ${source.name.split(" · ")[0]}`, status: "Archived", weatherChanged: false },
            ]);
            setDuplicating(null);
            toast(`Plan duplicated for ${c.name}`);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          setPlans((list) => list.filter((x) => x.id !== deleting?.id));
          toast("Plan deleted");
        }}
        title="Delete this plan?"
        body={`"${deleting?.name}" will be removed. Your scans and wishlist are not affected.`}
        confirmLabel="Delete plan"
        destructive
      />
    </>
  );
}

/** Sample per-metric values for an older scan, derived from its overall score. */
function metricsFor(scanId: string) {
  const scan = scanHistory.find((s) => s.id === scanId)!;
  const offset = scan.score - latestScan.overall;
  return latestScan.metrics.map((m, i) => ({
    name: m.name,
    value: Math.max(0, Math.min(100, m.value + Math.round(offset * ((i % 3) * 0.5 + 0.6)))),
  }));
}

function ScansTab() {
  const router = useRouter();
  const hasScan = useHasScan();
  const { profile } = useAppState();
  const [a, setA] = useState(scanHistory[scanHistory.length - 2]!.id);
  const [b, setB] = useState(scanHistory[scanHistory.length - 1]!.id);
  const [comparing, setComparing] = useState(false);

  if (hasScan === null) return <div className="h-64 animate-pulse rounded-3xl bg-white" />;
  if (!hasScan) {
    return (
      <EmptyState
        icon={ScanFace}
        title="No scans yet"
        body="Scan regularly in similar light to track changes."
        action={<ButtonLink href="/scan">Start a scan</ButtonLink>}
      />
    );
  }

  const W = 640;
  const H = 200;
  const min = 55;
  const max = 80;
  const pts = scanHistory.map((s, i) => ({
    ...s,
    x: 40 + (i * (W - 80)) / (scanHistory.length - 1),
    y: H - 30 - ((s.score - min) / (max - min)) * (H - 60),
  }));
  const metricsA = metricsFor(a);
  const metricsB = metricsFor(b);
  const scanA = scanHistory.find((s) => s.id === a)!;
  const scanB = scanHistory.find((s) => s.id === b)!;

  return (
    <div className="space-y-6">
      {!profile.keepScanHistory && (
        <p className="rounded-2xl bg-sun-50 px-4 py-3 text-sm text-sun-700">
          Scan history is turned off in Settings, so new scans won&apos;t be added to this chart.
        </p>
      )}
      <Card>
        <h2 className="text-lg font-semibold text-ink">Skin score over time</h2>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Skin score chart">
          {[60, 70, 80].map((v) => {
            const y = H - 30 - ((v - min) / (max - min)) * (H - 60);
            return (
              <g key={v}>
                <line x1={30} x2={W - 20} y1={y} y2={y} stroke="#E1E7E5" strokeDasharray="4 4" />
                <text x={4} y={y + 4} fontSize="11" fill="#6A7A7D">
                  {v}
                </text>
              </g>
            );
          })}
          <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#24695C" strokeWidth="2.5" strokeLinejoin="round" />
          {pts.map((p) => (
            <g key={p.id} className="cursor-pointer" onClick={() => router.push(`/report/${p.id}`)}>
              <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={5} fill="#fff" stroke="#24695C" strokeWidth="2.5" />
              <text x={p.x} y={H - 8} fontSize="11" fill="#6A7A7D" textAnchor="middle">
                {p.date}
              </text>
              <text x={p.x} y={p.y - 12} fontSize="11" fontWeight="600" fill="#17262A" textAnchor="middle">
                {p.score}
              </text>
            </g>
          ))}
        </svg>
        <p className="mt-2 text-xs text-muted">Click a point to open that scan&apos;s report.</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-ink">History</h2>
          <ul className="mt-3 divide-y divide-line">
            {[...scanHistory].reverse().map((s, i, arr) => {
              const prev = arr[i + 1];
              const delta = prev ? s.score - prev.score : 0;
              return (
                <li key={s.id}>
                  <Link href={`/report/${s.id}`} className="flex items-center justify-between py-3 text-sm hover:text-brand-600">
                    <span>
                      <span className="font-medium text-ink">{s.date}</span> <span className="text-muted">· {s.city}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className={`font-semibold ${scoreTone(s.score).text}`}>{s.score}</span>
                      {prev && <span className={`w-8 text-right text-xs ${delta >= 0 ? "text-brand-500" : "text-rose-500"}`}>{delta >= 0 ? `+${delta}` : delta}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted">Changes are observations, not proof a product worked. Lighting affects results.</p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-ink">Compare two scans</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              [a, setA, "First scan"],
              [b, setB, "Second scan"],
            ].map(([value, set, label]) => (
              <label key={label as string} className="text-xs font-medium text-muted">
                {label as string}
                <select
                  value={value as string}
                  onChange={(e) => {
                    (set as (v: string) => void)(e.target.value);
                    setComparing(false);
                  }}
                  className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-400"
                >
                  {scanHistory.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} · {s.score}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <Button className="mt-4" onClick={() => setComparing(true)} disabled={a === b}>
            Compare
          </Button>
          {a === b && <p className="mt-2 text-xs text-muted">Pick two different dates.</p>}

          {comparing && a !== b && (
            <div className="mt-5">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-2 text-sm">
                <span className="text-xs text-muted" />
                <span className="text-xs font-medium text-muted">{scanA.date}</span>
                <span className="text-xs font-medium text-muted">{scanB.date}</span>
                <span className="text-xs font-medium text-muted">Change</span>
                {metricsA.map((m, i) => {
                  const after = metricsB[i]!.value;
                  const d = after - m.value;
                  return (
                    <div key={m.name} className="contents">
                      <span className="text-ink-soft">{m.name}</span>
                      <span className="text-right text-ink">{m.value}</span>
                      <span className="text-right font-semibold text-ink">{after}</span>
                      <span className={`flex items-center justify-end gap-0.5 text-xs font-medium ${d > 0 ? "text-brand-500" : d < 0 ? "text-rose-500" : "text-muted"}`}>
                        {d > 0 ? <ArrowUp size={12} /> : d < 0 ? <ArrowDown size={12} /> : null}
                        {d === 0 ? "–" : Math.abs(d)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-muted">Side-by-side photos with overlays will appear here once scans are stored by the API.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function WishlistTab() {
  const toast = useToast();
  const productLink = useProductLink();
  const { wishlist, toggleWishlist, city } = useAppState();
  const items = wishlist.map(productById).filter((p): p is Product => Boolean(p));

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Your wishlist is empty"
        body="Tap the heart on any product to keep it here and get price-drop alerts."
        action={<ButtonLink href="/products">Browse products</ButtonLink>}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((p) => (
        <Card key={p.id} className="relative">
          <button
            onClick={() => {
              toggleWishlist(p.id);
              toast("Removed from wishlist");
            }}
            aria-label={`Remove ${p.name} from wishlist`}
            className="absolute top-4 right-4 rounded-full p-2 hover:bg-canvas"
          >
            <Heart size={18} className="fill-rose-500 text-rose-500" />
          </button>
          <Link href={productLink(p.id)} scroll={false} className="flex gap-4 pr-8">
            <ProductThumb category={p.category} size={64} />
            <div className="min-w-0">
              <p className="text-xs text-muted">{p.brand}</p>
              <p className="line-clamp-2 text-sm font-semibold text-ink">{p.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">{formatPrice(lowestPrice(p), city.currency)}</span>
                {p.id === PRICE_DROP_ID && <Tag tone="brand">Price drop −12%</Tag>}
              </div>
            </div>
          </Link>
        </Card>
      ))}
    </div>
  );
}
