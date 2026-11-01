"use client";

import { useRouter } from "next/navigation";
import { Glasses, Lightbulb, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ScanCapture } from "@/components/scan/ScanCapture";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader, StepProgress, Tag } from "@/components/ui/Kit";
import { ConfirmDialog } from "@/components/ui/Overlay";
import { glowApi, message } from "@/lib/glow-api";

const ANALYSIS_STEPS = [
  "Photo uploaded",
  "Face detected",
  "Measuring 8 skin features…",
  "Building your report",
];
const MEASURED = [
  "Moisture",
  "Oiliness",
  "Acne",
  "Pores",
  "Redness",
  "Texture",
  "Wrinkles",
  "Dark circles",
];

export default function ScanPage() {
  const router = useRouter();
  const toast = useToast();
  const { profile, updateProfile, acceptScan } = useAppState();
  const [consent, setConsent] = useState(profile.scanConsent);
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);
  const [confirmStop, setConfirmStop] = useState(false);
  const pendingHref = useRef<string | null>(null);
  const taskId = useRef<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => setConsent((c) => c || profile.scanConsent),
    [profile.scanConsent],
  );

  useEffect(() => {
    if (!analyzing || !photo) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const check = async (id: string) => {
      try {
        const scan = await glowApi.scan(id);
        if (!active) return;
        if (scan.status === "success") {
          acceptScan(scan);
          setAnalyzing(false);
          setPhoto(null);
          taskId.current = null;
          toast("Your skin report is ready");
          router.push(`/report/${scan.id}`);
        } else if (["error", "timeout", "cancelled"].includes(scan.status)) {
          setError(scan.error || "Scan stopped. Please try again.");
          setAnalyzing(false);
        } else {
          setStep(2);
          timer = setTimeout(() => void check(id), 2000);
        }
      } catch (err) {
        if (active) {
          setError(message(err));
          setAnalyzing(false);
        }
      }
    };
    (async () => {
      try {
        if (
          !profile.scanConsent &&
          !(await updateProfile({ scanConsent: true }))
        ) {
          setAnalyzing(false);
          return;
        }
        const task = await glowApi.startScan(photo);
        taskId.current = task.id;
        if (!active) {
          await glowApi.cancelScan(task.id);
          return;
        }
        setStep(1);
        await check(task.id);
      } catch (err) {
        if (active) {
          setError(message(err));
          setAnalyzing(false);
        }
      }
    })();
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // A scan is started once per explicit capture/retry. Poll updates must not start another task.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzing, photo]);

  // Leaving during analysis (Esc, sidebar links, closing the tab) asks first.
  useEffect(() => {
    if (!analyzing) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setConfirmStop(true);
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      const href = link?.getAttribute("href");
      if (!href || !href.startsWith("/") || link?.target === "_blank") return;
      e.preventDefault();
      e.stopPropagation();
      pendingHref.current = href;
      setConfirmStop(true);
    };
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [analyzing]);

  const stopScan = useCallback(() => {
    if (taskId.current) void glowApi.cancelScan(taskId.current).catch(() => {});
    taskId.current = null;
    setAnalyzing(false);
    setStep(0);
    const href = pendingHref.current;
    pendingHref.current = null;
    if (href) router.push(href);
  }, [router]);

  function giveConsent(checked: boolean) {
    setConsent(checked);
    if (checked) void updateProfile({ scanConsent: true });
  }

  return (
    <>
      <PageHeader title="Skin scan" context="Take a selfie or upload a photo" />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600"
            >
              <p>{error}</p>
              {photo && (
                <Button
                  className="mt-3"
                  onClick={() => {
                    setError(null);
                    setStep(0);
                    setAnalyzing(true);
                  }}
                >
                  Retry same photo
                </Button>
              )}
            </div>
          )}
          {analyzing ? (
            <div className="mx-auto max-w-sm py-10">
              <div className="mx-auto mb-8 grid h-20 w-20 place-items-center rounded-full bg-brand-50">
                <Sparkles size={32} className="animate-pulse text-brand-500" />
              </div>
              <h2 className="mb-1 text-center text-lg font-semibold text-ink">
                Analyzing your skin
              </h2>
              <p className="mb-6 text-center text-sm text-muted">
                This takes about 10–20 seconds.
              </p>
              <StepProgress steps={ANALYSIS_STEPS} active={step} />
              <div className="mt-8 text-center">
                <Button variant="ghost" onClick={() => setConfirmStop(true)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {!profile.scanConsent && (
                <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-canvas p-4 text-sm text-ink-soft has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => giveConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-brand-500"
                  />
                  <span>
                    I agree my photo is sent to YouCam for analysis. GlowGuide
                    keeps only scores and detection masks. Results are cosmetic
                    guidance, not a medical diagnosis.
                  </span>
                </label>
              )}
              <ScanCapture
                enabled={consent}
                onUse={(image) => {
                  setPhoto(image);
                  setError(null);
                  setStep(0);
                  setAnalyzing(true);
                }}
              />
            </>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-sm font-semibold text-ink">Before you scan</h2>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              <li className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-sun-50 text-sun-600">
                  <Lightbulb size={17} />
                </span>
                Face a window or soft light
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-600">
                  <Glasses size={17} />
                </span>
                Remove glasses, pull hair back
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-500">
                  <Sparkles size={17} />
                </span>
                Clean face, no makeup if possible
              </li>
            </ul>
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-ink">What we measure</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {MEASURED.map((m) => (
                <Tag key={m}>{m}</Tag>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              Analysis by YouCam Skin AI (HD).
            </p>
          </Card>
          <p className="flex items-start gap-2 px-1 text-xs text-muted">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-500" />
            We never store your selfie. Only the scores and highlighted areas
            are kept.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmStop}
        onClose={() => {
          setConfirmStop(false);
          pendingHref.current = null;
        }}
        onConfirm={stopScan}
        title="Stop this scan?"
        body="Your photo hasn't been analyzed yet. Stopping now cancels this scan."
        confirmLabel="Stop scan"
        destructive
      />
    </>
  );
}
