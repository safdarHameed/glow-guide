"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Kit";
import { Logo } from "@/components/ui/Logo";
import { setOnboardingState } from "@/lib/flags";
import { cityById } from "@/lib/mock-data";
import { AvoidPicker, BudgetPicker, CitySearch, ConcernPicker, OwnedPicker } from "./ProfilePickers";

const steps = ["Location", "Skin and goals", "Budget"];

type LocationState = "idle" | "locating" | "denied" | "detected" | "chosen" | "editing";

/** S03: three steps; only location is required. Back keeps entered answers. */
export function OnboardingWizard() {
  const router = useRouter();
  const intent = useSearchParams().get("intent");
  const { user } = useAuth();
  const { setCity, updateProfile } = useAppState();

  const [step, setStep] = useState(0);
  const [cityId, setCityId] = useState<string | null>(null);
  const [loc, setLoc] = useState<LocationState>("idle");
  const [concerns, setConcerns] = useState<string[]>([]);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [budget, setBudget] = useState({ mode: "routine" as "product" | "routine", min: 1000, max: 15000 });

  const city = cityId ? cityById(cityId) : null;
  const firstName = user?.name.split(" ")[0] ?? "there";

  function detect() {
    if (!navigator.geolocation) {
      setLoc("denied");
      return;
    }
    setLoc("locating");
    navigator.geolocation.getCurrentPosition(
      () => {
        // Reverse geocoding arrives with the environment API; sample data resolves to Lahore.
        setCityId("lahore");
        setLoc("detected");
      },
      () => setLoc("denied"),
      { timeout: 8000 },
    );
  }

  function finish() {
    if (!cityId) return;
    updateProfile({ concerns, avoid, owned, budgetMode: budget.mode, budgetMin: budget.min, budgetMax: budget.max });
    setCity(cityId);
    setOnboardingState("done");
    router.replace(intent === "scan" ? "/scan" : "/dashboard");
  }

  function skip() {
    if (cityId) setCity(cityId);
    setOnboardingState("skipped");
    router.replace("/dashboard");
  }

  const showSearch = loc === "denied" || loc === "editing";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4 sm:px-8">
        <Logo />
        <button onClick={skip} className="text-sm font-medium text-ink-soft hover:text-brand-600">
          Skip for now
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Let&apos;s set up your profile, {firstName}</h1>
        <p className="mt-2 text-sm text-muted">Takes about a minute. You can change everything later in Settings.</p>

        <ol className="mt-8 grid grid-cols-3 gap-3">
          {steps.map((s, i) => (
            <li key={s}>
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <motion.div className="h-full bg-brand-500" initial={false} animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }} />
              </div>
              <p className={`mt-2 text-xs font-medium ${i <= step ? "text-ink" : "text-muted"}`}>
                {i + 1} {s}
              </p>
            </li>
          ))}
        </ol>

        <Card className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-ink">Where do you live?</h2>
                  <p className="mt-1 text-sm text-muted">We use it for weather, air quality, stores and currency. Your skin scan stays the same wherever you go.</p>

                  {city && (loc === "detected" || loc === "chosen") ? (
                    <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-brand-50 px-4 py-3">
                      <p className="flex items-center gap-2 text-sm text-brand-700">
                        <MapPin size={16} />
                        <span>
                          <span className="font-semibold">
                            {city.name}, {city.country}
                          </span>{" "}
                          · {loc === "detected" ? "detected from your browser" : "chosen by you"}
                        </span>
                      </p>
                      <button onClick={() => setLoc("editing")} className="text-sm font-semibold text-brand-600 hover:underline">
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {!showSearch && (
                        <Button variant="secondary" onClick={detect} disabled={loc === "locating"}>
                          {loc === "locating" ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
                          Use my current location
                        </Button>
                      )}
                      {loc === "denied" && <p className="text-sm text-sun-700">Location access is off. Search for your city instead.</p>}
                      {showSearch ? (
                        <CitySearch
                          autoFocus
                          onSelect={(c) => {
                            setCityId(c.id);
                            setLoc("chosen");
                          }}
                        />
                      ) : (
                        <button onClick={() => setLoc("editing")} className="block text-sm font-medium text-brand-600 hover:underline">
                          Or search for a city
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )}

              {step === 1 && (
                <section className="space-y-7">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">What would you like to improve?</h2>
                    <p className="mt-1 mb-3 text-sm text-muted">Pick up to 3. They raise the weight of matching skin scores in your plan.</p>
                    <ConcernPicker value={concerns} onChange={setConcerns} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Ingredients to avoid</h3>
                    <p className="mt-1 mb-3 text-sm text-muted">Products containing these are hidden or flagged everywhere in the app.</p>
                    <AvoidPicker value={avoid} onChange={setAvoid} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      Products you already own <span className="font-normal text-muted">(optional)</span>
                    </h3>
                    <div className="mt-3">
                      <OwnedPicker value={owned} onChange={setOwned} />
                    </div>
                  </div>
                </section>
              )}

              {step === 2 && city && (
                <section>
                  <h2 className="text-lg font-semibold text-ink">What&apos;s your budget?</h2>
                  <p className="mt-1 mb-5 text-sm text-muted">Currency {city.currency} set from your country.</p>
                  <BudgetPicker mode={budget.mode} min={budget.min} max={budget.max} currency={city.currency} onChange={setBudget} />
                </section>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              Back
            </Button>
            {step < 2 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !cityId}>
                Continue
              </Button>
            ) : (
              <Button onClick={finish}>{intent === "scan" ? "Finish and scan" : "Finish"}</Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
