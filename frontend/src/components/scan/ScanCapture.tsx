"use client";

import { Camera, CheckCircle2, CircleAlert, ImageUp, Loader2, RefreshCw, SwitchCamera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

type CamState = "off" | "starting" | "live" | "denied";
type Check = { label: string; ok: boolean };

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Camera or upload, ending in a photo preview with Retake / Use this photo.
 * The raw image never leaves this component except through onUse (and is never stored).
 */
export function ScanCapture({ enabled, onUse }: { enabled: boolean; onUse: (photo: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cam, setCam] = useState<CamState>("off");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [checks, setChecks] = useState<Check[]>([
    { label: "Lighting good", ok: true },
    { label: "Face centered", ok: false },
    { label: "Move a little closer", ok: false },
  ]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Start the camera only after consent; always stop the tracks when leaving.
  useEffect(() => {
    if (!enabled || photo) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCam("denied");
      return;
    }
    let stream: MediaStream | null = null;
    let cancelled = false;
    setCam("starting");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setCam("live");
      })
      .catch(() => !cancelled && setCam("denied"));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled, facing, photo]);

  // Quality checks run in the browser on the feed; simulated here until face detection is wired in.
  useEffect(() => {
    if (cam !== "live") return;
    setChecks([
      { label: "Lighting good", ok: true },
      { label: "Face centered", ok: false },
      { label: "Move a little closer", ok: false },
    ]);
    const t1 = setTimeout(() => setChecks((c) => c.map((x, i) => (i === 1 ? { ...x, ok: true } : x))), 1500);
    const t2 = setTimeout(() => setChecks((c) => c.map((x, i) => (i === 2 ? { label: "Distance good", ok: true } : x))), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [cam]);

  const allGreen = checks.every((c) => c.ok);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL("image/jpeg", 0.9));
  }

  function onFile(file: File | undefined) {
    setUploadError(null);
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return setUploadError("Please choose a JPG or PNG photo.");
    if (file.size > MAX_BYTES) return setUploadError("That photo is over 10 MB. Please choose a smaller one.");
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/jpeg,image/png"
      className="hidden"
      onChange={(e) => {
        onFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (photo) {
    return (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="Your photo" className="mx-auto aspect-[3/4] max-h-[480px] w-full rounded-3xl bg-ink object-cover" />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => setPhoto(null)}>
            <RefreshCw size={16} /> Retake
          </Button>
          <Button onClick={() => onUse(photo)}>Use this photo</Button>
        </div>
      </div>
    );
  }

  if (cam === "denied") {
    return (
      <div>
        <button
          onClick={() => enabled && fileRef.current?.click()}
          disabled={!enabled}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-6 text-center transition-colors hover:border-brand-400 disabled:opacity-60"
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-brand-500 shadow-sm">
            <ImageUp size={26} />
          </span>
          <span className="text-base font-semibold text-ink">Upload a selfie</span>
          <span className="text-sm text-muted">JPG or PNG, up to 10 MB. Face the light, no glasses.</span>
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          Camera access is off. To use the camera, allow it in your browser&apos;s site settings and reload this page.
        </p>
        {uploadError && <p className="mt-2 text-center text-sm text-rose-600">{uploadError}</p>}
        {fileInput}
      </div>
    );
  }

  return (
    <div>
      <div className="relative mx-auto aspect-[3/4] max-h-[480px] w-full overflow-hidden rounded-3xl bg-ink">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""} ${cam === "live" ? "" : "opacity-0"}`}
        />
        {cam !== "live" && (
          <div className="absolute inset-0 grid place-items-center text-center text-sm text-white/70">
            {cam === "starting" ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Starting camera…
              </span>
            ) : (
              <span className="max-w-[16rem]">Tick the consent box to turn on the camera.</span>
            )}
          </div>
        )}
        {/* Oval guide */}
        <div
          className={`pointer-events-none absolute top-1/2 left-1/2 h-[68%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[3px] border-dashed transition-colors ${
            allGreen && cam === "live" ? "border-brand-300" : "border-white/50"
          }`}
        />
        {cam === "live" && (
          <div className="absolute inset-x-3 top-3 flex flex-wrap justify-center gap-1.5">
            {checks.map((c) => (
              <span
                key={c.label}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  c.ok ? "bg-brand-500 text-white" : "bg-sun-500 text-white"
                }`}
              >
                {c.ok ? <CheckCircle2 size={12} /> : <CircleAlert size={12} />} {c.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={!enabled}>
          <ImageUp size={16} /> Upload
        </Button>
        <button
          onClick={capture}
          disabled={!enabled || cam !== "live" || !allGreen}
          aria-label="Capture photo"
          className="grid h-16 w-16 place-items-center rounded-full bg-brand-500 text-white shadow-[0_10px_30px_-10px_rgba(36,105,92,0.8)] ring-4 ring-brand-100 transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-40"
        >
          <Camera size={24} />
        </button>
        <Button variant="secondary" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} disabled={cam !== "live"}>
          <SwitchCamera size={16} /> Switch
        </Button>
      </div>
      {uploadError && <p className="mt-2 text-center text-sm text-rose-600">{uploadError}</p>}
      {fileInput}
    </div>
  );
}
