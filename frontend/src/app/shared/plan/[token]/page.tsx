"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { message } from "@/lib/glow-api";
import { formatPrice, type PlanRecord } from "@/lib/domain";
import { Logo } from "@/components/ui/Logo";
import { Card, SafetyNote } from "@/components/ui/Kit";

export default function SharedPlan() {
  const { token } = useParams<{ token: string }>();
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    api<PlanRecord>(`/shared/plans/${encodeURIComponent(token)}`, {
      refreshOnUnauthorized: false,
    })
      .then((p) => {
        if (active) setPlan(p);
      })
      .catch((err) => {
        if (active) setError(message(err));
      });
    return () => {
      active = false;
    };
  }, [token]);
  return (
    <div className="min-h-screen bg-canvas p-6">
      <header className="mx-auto max-w-5xl">
        <Logo />
      </header>
      <main className="mx-auto mt-10 max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Shared routine · read only
        </p>
        {error ? (
          <p role="alert" className="mt-5 text-rose-600">
            {error}
          </p>
        ) : !plan ? (
          <div className="mt-5 h-80 animate-pulse rounded-3xl bg-white" />
        ) : (
          <>
            <h1 className="mt-3 text-3xl font-semibold text-ink">
              {plan.name}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {plan.city.name} · {formatPrice(plan.total, plan.city.currency)}
            </p>
            <SafetyNote>
              Cosmetic suggestions only. Patch-test new products.
            </SafetyNote>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {(["morning", "evening"] as const).map((time) => (
                <Card key={time}>
                  <h2 className="font-semibold capitalize text-ink">{time}</h2>
                  <ol className="mt-4 space-y-5">
                    {plan[time].map((step) => {
                      const p = plan.products.find(
                        (p) => p.id === step.productId,
                      );
                      return (
                        <li key={step.id}>
                          <p className="text-xs text-muted">{step.category}</p>
                          <p className="font-medium text-ink">
                            {p?.brand} {p?.name}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {step.reason}
                          </p>
                          {p?.offers.map((offer) => (
                            <a
                              key={offer.url}
                              href={offer.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 block text-xs text-brand-600"
                            >
                              {offer.store} ·{" "}
                              {formatPrice(offer.price, plan.city.currency)}
                              {offer.verified ? "" : " · unconfirmed"}
                            </a>
                          ))}
                        </li>
                      );
                    })}
                  </ol>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
