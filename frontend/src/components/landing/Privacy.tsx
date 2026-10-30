import { FileX2, HeartPulse, Trash2 } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";

const points = [
  { icon: FileX2, title: "Selfies are never stored", body: "Your photo is analyzed, then deleted. Only scores and masks are kept." },
  { icon: Trash2, title: "Your data, your call", body: "Turn off history, download everything, or delete all scans any time." },
  { icon: HeartPulse, title: "Cosmetic guidance only", body: "Not a medical diagnosis. See a dermatologist for persistent conditions." },
];

export function Privacy() {
  return (
    <section id="privacy" className="relative overflow-hidden bg-brand-700 py-20 text-white sm:py-24">
      <div className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full bg-brand-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-sun-500/15 blur-3xl" />
      <div className="relative mx-auto max-w-page px-4 sm:px-8 xl:px-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-brand-200 uppercase">Privacy first</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            Your face is yours. <span className="italic text-sun-300">Always.</span>
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {points.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl bg-white/[0.08] p-6 ring-1 ring-white/15 transition-colors hover:bg-white/[0.13]">
                <p.icon size={24} className="text-brand-200" />
                <h3 className="mt-4 font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
