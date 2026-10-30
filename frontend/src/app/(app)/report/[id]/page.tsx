"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, ChevronDown, Download, Eye, EyeOff, RefreshCw, ScanFace, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { BuildPlanModal } from "@/components/report/BuildPlanModal";
import { FaceMap, overlayKeys, type Overlay } from "@/components/report/FaceMap";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState, PageHeader, SafetyNote, Tag } from "@/components/ui/Kit";
import { MetricBar, ScoreRing } from "@/components/ui/Motion";
import { useHasScan } from "@/lib/flags";
import { latestScan, scanHistory } from "@/lib/mock-data";
import { scoreTone } from "@/lib/routes";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const hasScan = useHasScan();
  const isDemo = id === "demo";

  if (!isDemo && hasScan === null) return <div className="h-96 animate-pulse rounded-3xl bg-white" />;

  if (!isDemo && !hasScan) {
    return (
      <>
        <PageHeader title="Skin report" context="Your results appear here after your first scan" />
        <EmptyState
          icon={ScanFace}
          title="No skin report yet"
          body="A 20-second selfie measures 8 skin features and builds your first report."
          action={<ButtonLink href="/scan">Start scan</ButtonLink>}
        />
      </>
    );
  }

  return <Report scanId={id} isDemo={isDemo} />;
}

function Report({ scanId, isDemo }: { scanId: string; isDemo: boolean }) {
  const { city } = useAppState();
  const [overlay, setOverlay] = useState<Overlay>("oiliness");
  const [showOverlay, setShowOverlay] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);

  // Older scans reuse the sample metrics with their own date and overall score.
  const past = scanHistory.find((s) => s.id === scanId);
  const scan = past && past.id !== latestScan.id ? { ...latestScan, date: past.date, overall: past.score, time: "", city: past.city } : latestScan;
  const tone = scoreTone(scan.overall);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skin report"
        context={`Scanned ${scan.date === latestScan.date ? "today" : scan.date}${scan.time ? `, ${scan.time}` : ""} · ${scan.city}`}
        actions={
          isDemo ? (
            <ButtonLink href="/auth?mode=signup&intent=scan">
              Get my own report <ArrowRight size={16} />
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/scan" variant="secondary" size="sm">
                <RefreshCw size={15} /> Rescan
              </ButtonLink>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Download size={15} /> Save as PDF
              </Button>
            </>
          )
        }
      />

      <SafetyNote>
        Scores are cosmetic estimates from a photo, not a medical diagnosis. See a dermatologist for persistent or painful conditions.
      </SafetyNote>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {overlayKeys.map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setOverlay(k);
                    setShowOverlay(true);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    overlay === k ? "bg-ink text-white" : "bg-canvas text-ink-soft hover:bg-brand-50"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowOverlay((v) => !v)}
              aria-pressed={showOverlay}
              className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
            >
              {showOverlay ? <Eye size={14} /> : <EyeOff size={14} />} Overlay {showOverlay ? "on" : "off"}
            </button>
          </div>
          <div className="mt-4">
            <FaceMap overlay={overlay} show={showOverlay} />
          </div>
          <p className="mt-3 text-center text-xs text-muted">Highlighted areas come from the YouCam result masks.</p>

          <div className="mt-5 flex items-center gap-5 rounded-2xl bg-canvas p-4">
            <ScoreRing score={scan.overall} size={92} label="overall" />
            <div>
              <p className="text-lg font-semibold text-ink">
                {scan.skinType} <span className="text-sm font-normal text-muted">· age ≈ {scan.age}</span>
              </p>
              <p className={`mt-1 flex items-center gap-1 text-sm font-medium ${tone.text}`}>
                <TrendingUp size={15} /> +{scan.change} since Oct 12
              </p>
              {!isDemo && (
                <Link href="/saved?tab=scans" className="mt-1 inline-block text-xs font-medium text-brand-600 hover:underline">
                  Change since last scan
                </Link>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">8 skin measurements</h2>
              <p className="text-xs text-muted">Higher is better</p>
            </div>
            <ul className="mt-4 divide-y divide-line">
              {scan.metrics.map((m) => {
                const open = expanded === m.key;
                const linked = overlayKeys.includes(m.key as Overlay);
                return (
                  <li key={m.key}>
                    <button
                      onClick={() => {
                        setExpanded(open ? null : m.key);
                        if (linked) {
                          setOverlay(m.key as Overlay);
                          setShowOverlay(true);
                        }
                      }}
                      aria-expanded={open}
                      className="flex w-full items-center gap-4 py-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <MetricBar label={m.name} value={m.value} />
                        <p className="mt-1 text-[11px] text-muted">{m.note}</p>
                      </div>
                      <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <div className="mb-3 rounded-2xl bg-canvas p-4 text-sm">
                        <p className="text-ink-soft">{m.meaning}</p>
                        <p className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">Usually helps</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.helps.map((h) => (
                            <Tag key={h} tone="brand">
                              {h}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="bg-brand-50/60">
            <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Your priorities</p>
            <ol className="mt-3 grid gap-2 sm:grid-cols-3">
              {scan.priorities.map((p, i) => (
                <li key={p} className="flex items-center gap-2.5 rounded-2xl bg-white p-3 text-sm font-medium text-ink">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500 text-xs text-white">{i + 1}</span>
                  {p}
                </li>
              ))}
            </ol>
            {isDemo ? (
              <p className="mt-5 text-sm text-ink-soft">
                In your own account, this report turns into a morning and evening routine from stores in your city.
              </p>
            ) : (
              <Button size="lg" className="mt-5 w-full sm:w-auto" onClick={() => setBuilding(true)}>
                <Sparkles size={17} /> Build my plan for {city.name}
              </Button>
            )}
          </Card>
        </div>
      </div>

      <BuildPlanModal open={building} onClose={() => setBuilding(false)} />
    </div>
  );
}
