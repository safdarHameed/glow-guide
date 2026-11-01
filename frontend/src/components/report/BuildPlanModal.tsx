"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { StepProgress } from "@/components/ui/Kit";
import { glowApi, message } from "@/lib/glow-api";
import { Modal } from "@/components/ui/Overlay";

/** Long task with named steps (blueprint rule P), then opens the plan. */
export function BuildPlanModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { city, adoptPlan } = useAppState();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const steps = [
    "Reading your skin",
    `Checking ${city.name} weather`,
    `Searching ${city.stores.length} stores`,
    "Ranking suitable products",
    "Writing reasons",
  ];

  useEffect(() => {
    if (!open) {
      setStep(0);
      setError(null);
      return;
    }
    let active = true;
    glowApi
      .buildPlan(city)
      .then((plan) => {
        if (active) {
          adoptPlan(plan);
          setStep(steps.length);
          onClose();
          router.push(`/plan/${plan.id}`);
        }
      })
      .catch((err) => {
        if (active) setError(message(err));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Building your plan for ${city.name}`}
      size="sm"
    >
      <p className="mb-5 text-sm text-muted">
        This usually takes 10–40 seconds.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted">
            Checking your skin, weather and local products…
          </p>
          <StepProgress steps={steps} active={step} />
        </>
      )}
    </Modal>
  );
}
