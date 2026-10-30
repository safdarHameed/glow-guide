"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { StepProgress } from "@/components/ui/Kit";
import { Modal } from "@/components/ui/Overlay";

/** Long task with named steps (blueprint rule P), then opens the plan. */
export function BuildPlanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { city, setPlanOutdated } = useAppState();
  const [step, setStep] = useState(0);
  const steps = [
    "Reading your skin",
    `Checking ${city.name} weather`,
    `Searching ${city.stores.length} stores`,
    "Ranking 38 products",
    "Writing reasons",
  ];

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }
    if (step >= steps.length) {
      setPlanOutdated(false);
      router.push("/plan/current");
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [open, step, steps.length, router, setPlanOutdated]);

  return (
    <Modal open={open} onClose={onClose} title={`Building your plan for ${city.name}`} size="sm">
      <p className="mb-5 text-sm text-muted">This usually takes 10–40 seconds.</p>
      <StepProgress steps={steps} active={step} />
    </Modal>
  );
}
