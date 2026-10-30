"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Bell, ChevronRight, Download, Leaf, LogOut, MapPin, Shield, Trash2, User as UserIcon, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/app/AppShell";
import { CityPicker } from "@/components/app/CityPicker";
import { AvoidPicker, BudgetPicker, ConcernPicker, OwnedPicker } from "@/components/onboarding/ProfilePickers";
import { useAppState, type Profile } from "@/components/providers/AppStateProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Card, Chip, PageHeader, Tag, Toggle } from "@/components/ui/Kit";
import { ConfirmDialog } from "@/components/ui/Overlay";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/auth";
import { setHasScan } from "@/lib/flags";
import { latestScan } from "@/lib/mock-data";

type Section = "profile" | "skin" | "location" | "budget" | "notifications" | "privacy";

const sections: { id: Section; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "skin", label: "Skin and goals", icon: Leaf },
  { id: "location", label: "Location and units", icon: MapPin },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy and data", icon: Shield },
];

/** Profile fields each section edits, used to detect unsaved changes. */
const sectionKeys: Record<Section, (keyof Profile)[]> = {
  profile: [],
  skin: ["skinTypeOverride", "concerns", "avoid", "owned"],
  location: ["units"],
  budget: ["budgetMode", "budgetMin", "budgetMax"],
  notifications: ["notifications"],
  privacy: ["keepScanHistory"],
};

const isSection = (v: string | null): v is Section => sections.some((s) => s.id === v);

/** S14: edits what onboarding collected, plus notifications and data controls. */
export function SettingsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { logout } = useAuth();
  const { profile, updateProfile, setPlanOutdated } = useAppState();
  const sectionParam = params.get("section");
  const section: Section = isSection(sectionParam) ? sectionParam : "skin";

  const [draft, setDraft] = useState<Profile>(profile);
  const [pending, setPending] = useState<Section | null>(null);

  // Pick up stored values once they load, and reset after saving.
  useEffect(() => setDraft(profile), [profile]);

  const dirty = sectionKeys[section].some((k) => JSON.stringify(draft[k]) !== JSON.stringify(profile[k]));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function go(to: Section) {
    if (to === section) return;
    if (dirty) setPending(to);
    else router.replace(`/settings?section=${to}`, { scroll: false });
  }

  function save() {
    updateProfile(draft);
    setPlanOutdated(true);
    toast("Saved");
  }

  const patch = (p: Partial<Profile>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <>
      <PageHeader title="Settings" context="Your profile, preferences and data" />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="flex gap-1 overflow-x-auto rounded-3xl border border-line bg-white p-2 lg:flex-col lg:self-start">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              aria-current={section === s.id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left text-sm font-medium whitespace-nowrap transition-colors ${
                section === s.id ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-canvas hover:text-ink"
              }`}
            >
              <s.icon size={17} />
              <span className="flex-1">{s.label}</span>
              <ChevronRight size={15} className="hidden text-muted lg:block" />
            </button>
          ))}
          <button
            onClick={() => void logout()}
            className="flex shrink-0 items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left text-sm font-medium whitespace-nowrap text-rose-600 hover:bg-rose-50 lg:mt-2 lg:border-t lg:border-line lg:pt-3"
          >
            <LogOut size={17} /> Log out
          </button>
        </nav>

        <div>
          {section === "profile" && <ProfileSection />}
          {section === "skin" && (
            <Panel title="Skin and goals" onSave={save} dirty={dirty}>
              <Group title="Skin type" hint="Defaults to your latest scan. A manual choice is used until your next scan.">
                <div className="flex flex-wrap gap-2">
                  <Chip selected={draft.skinTypeOverride === null} onClick={() => patch({ skinTypeOverride: null })}>
                    From latest scan: {latestScan.skinType}
                  </Chip>
                  {["Oily", "Dry", "Normal", "Sensitive"].map((t) => (
                    <Chip key={t} selected={draft.skinTypeOverride === t} onClick={() => patch({ skinTypeOverride: t })}>
                      {t}
                    </Chip>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                  In use: <span className="font-medium text-ink">{draft.skinTypeOverride ?? `${latestScan.skinType} (from scan)`}</span>
                </p>
              </Group>
              <Group title="Goals (up to 3)">
                <ConcernPicker value={draft.concerns} onChange={(concerns) => patch({ concerns })} />
              </Group>
              <Group title="Ingredients to avoid">
                <AvoidPicker value={draft.avoid} onChange={(avoid) => patch({ avoid })} />
              </Group>
              <Group title="Products I own">
                <OwnedPicker value={draft.owned} onChange={(owned) => patch({ owned })} />
              </Group>
            </Panel>
          )}
          {section === "location" && <LocationSection draft={draft} patch={patch} onSave={save} dirty={dirty} />}
          {section === "budget" && <BudgetSection draft={draft} patch={patch} onSave={save} dirty={dirty} />}
          {section === "notifications" && (
            <Panel title="Notifications" onSave={save} dirty={dirty}>
              {(
                [
                  ["uv", "UV and air-quality alerts", "When conditions in your city change your routine."],
                  ["scan", "Scan reminder", "Every 2–4 weeks, to track progress in similar light."],
                  ["price", "Price drops", "When a wishlist or plan product gets cheaper."],
                  ["trip", "Trip reminders", "Two days before a saved trip."],
                ] as const
              ).map(([key, label, hint]) => (
                <div key={key} className="flex items-center justify-between gap-4 border-b border-line py-4 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{label}</p>
                    <p className="text-xs text-muted">{hint}</p>
                  </div>
                  <Toggle
                    label={label}
                    checked={draft.notifications[key]}
                    onChange={(v) => patch({ notifications: { ...draft.notifications, [key]: v } })}
                  />
                </div>
              ))}
            </Panel>
          )}
          {section === "privacy" && <PrivacySection draft={draft} patch={patch} onSave={save} dirty={dirty} />}
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => {
          setDraft(profile);
          if (pending) router.replace(`/settings?section=${pending}`, { scroll: false });
        }}
        title="Discard changes?"
        body="You have unsaved changes in this section."
        confirmLabel="Discard changes"
        destructive
      />
    </>
  );
}

function Panel({ title, children, onSave, dirty }: { title: string; children: React.ReactNode; onSave?: () => void; dirty?: boolean }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-5 space-y-7">{children}</div>
      {onSave && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-xs text-muted">Changes apply next time your plan updates.</p>
          <Button onClick={onSave} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      )}
    </Card>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

type SectionProps = { draft: Profile; patch: (p: Partial<Profile>) => void; onSave: () => void; dirty: boolean };

function ProfileSection() {
  const toast = useToast();
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  if (!user) return null;

  async function sendResetLink() {
    setSending(true);
    try {
      await authApi.forgotPassword(user!.email);
      toast(`We've emailed you a link to ${user!.hasPassword ? "set a new" : "set a"} password`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't send the link. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Panel title="Profile">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} url={user.avatarUrl} size={56} />
        <div>
          <p className="text-lg font-semibold text-ink">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>
      <Group title="Password" hint={user.hasPassword ? "We'll email you a secure link to choose a new password." : "You sign in with Google. Add a password to also sign in with email."}>
        <Button variant="secondary" onClick={sendResetLink} loading={sending}>
          {user.hasPassword ? "Change password" : "Set a password"}
        </Button>
      </Group>
      <Group title="Google">
        {user.googleLinked ? <Tag tone="brand">Linked to Google</Tag> : <Tag>Not linked</Tag>}
      </Group>
      <Group title="Delete account" hint="Removes your account, scans and plans.">
        <Button variant="secondary" className="text-rose-600 hover:border-rose-300 hover:text-rose-600" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={16} /> Delete account
        </Button>
      </Group>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => toast("Account deletion isn't available yet")}
        title="Delete account"
        body="Self-service account deletion is coming soon and isn't available yet. Nothing will be deleted now."
        confirmLabel="Got it"
      />
    </Panel>
  );
}

function LocationSection({ draft, patch, onSave, dirty }: SectionProps) {
  const { city } = useAppState();
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <Panel title="Location and units" onSave={onSave} dirty={dirty}>
      <Group title="Home city" hint="Changing it refreshes weather, products and your plan. Your skin scan is kept.">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <MapPin size={16} className="text-brand-500" /> {city.name}, {city.country} · {city.currency}
          </p>
          <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
            Change city
          </Button>
        </div>
      </Group>
      <Group title="Temperature">
        <div className="flex gap-2">
          <Chip selected={draft.units === "C"} onClick={() => patch({ units: "C" })}>
            °C
          </Chip>
          <Chip selected={draft.units === "F"} onClick={() => patch({ units: "F" })}>
            °F
          </Chip>
        </div>
      </Group>
      <CityPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </Panel>
  );
}

function BudgetSection({ draft, patch, onSave, dirty }: SectionProps) {
  const { city } = useAppState();
  return (
    <Panel title="Budget" onSave={onSave} dirty={dirty}>
      <Group title="How should we budget?" hint={`Shown in ${city.currency}, set from your home city.`}>
        <BudgetPicker
          mode={draft.budgetMode}
          min={draft.budgetMin}
          max={draft.budgetMax}
          currency={city.currency}
          onChange={(v) => patch({ budgetMode: v.mode, budgetMin: v.min, budgetMax: v.max })}
        />
      </Group>
    </Panel>
  );
}

function PrivacySection({ draft, patch, onSave, dirty }: SectionProps) {
  const toast = useToast();
  const { user } = useAuth();
  const { profile, plan, wishlist } = useAppState();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typed, setTyped] = useState("");

  function download() {
    const data = { exportedAt: new Date().toISOString(), user, profile, plan, wishlist, latestScan };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "glowguide-data.json" });
    a.click();
    URL.revokeObjectURL(url);
    toast("Your data was downloaded");
  }

  return (
    <Panel title="Privacy and data" onSave={onSave} dirty={dirty}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink">Keep scan history</p>
          <p className="text-xs text-muted">
            {draft.keepScanHistory
              ? "Scores and masks are kept so you can track progress. Selfies are never stored."
              : "Off: scans are deleted after the report is shown, and the progress chart is disabled."}
          </p>
        </div>
        <Toggle label="Keep scan history" checked={draft.keepScanHistory} onChange={(v) => patch({ keepScanHistory: v })} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={download}>
          <Download size={16} /> Download my data
        </Button>
        <Button
          variant="secondary"
          className="text-rose-600 hover:border-rose-300 hover:text-rose-600"
          onClick={() => {
            setTyped("");
            setDeleteOpen(true);
          }}
        >
          <Trash2 size={16} /> Delete all scans
        </Button>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setHasScan(false);
          toast("All scans deleted");
        }}
        title="Delete all scans?"
        body="This removes all scores and masks. Your plans stay, but will show “scan deleted”. Type DELETE to confirm."
        confirmLabel="Delete all scans"
        destructive
        confirmDisabled={typed !== "DELETE"}
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="DELETE"
          aria-label="Type DELETE to confirm"
          className="mt-4 h-11 w-full rounded-xl border border-line px-4 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
        />
      </ConfirmDialog>
    </Panel>
  );
}
