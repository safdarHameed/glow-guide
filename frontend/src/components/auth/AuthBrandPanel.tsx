import { CloudSun, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export function AuthBrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 text-white lg:flex lg:flex-col">
      <div className="animate-blob pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-sun-300/25 blur-3xl" />
      <div className="animate-blob pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-sky-300/25 blur-3xl [animation-delay:-8s]" />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-15 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <div className="relative">
        <Logo light />
      </div>

      <div className="relative my-auto max-w-md">
        <h2 className="font-serif text-4xl leading-tight font-semibold xl:text-5xl">
          One scan. Every city you live in or travel to.
        </h2>
        <p className="mt-4 text-lg text-white/75">Your skin profile is saved once and reused when your weather changes.</p>

        <div className="mt-10 space-y-3">
          <div className="animate-float flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
              <MapPin size={18} className="text-sun-300" />
            </span>
            <div className="text-sm">
              <p className="font-semibold">Lahore → Dubai</p>
              <p className="text-white/65">Same skin, new weather, plan updated</p>
            </div>
          </div>
          <div className="animate-float-slow ml-8 flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur [animation-delay:-3s]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
              <CloudSun size={18} className="text-sky-200" />
            </span>
            <div className="text-sm">
              <p className="font-semibold">UV 10 · humidity 38%</p>
              <p className="text-white/65">Swap gel for a richer cream, add SPF 50+</p>
            </div>
          </div>
          <div className="animate-float flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur [animation-delay:-5s]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
              <Sparkles size={18} className="text-brand-200" />
            </span>
            <div className="text-sm">
              <p className="font-semibold">AI that shows its work</p>
              <p className="text-white/65">Every pick cites a real number</p>
            </div>
          </div>
        </div>
      </div>

      <p className="relative flex items-center gap-2 text-sm text-white/65">
        <ShieldCheck size={16} /> Photos are analyzed, then deleted. Not a medical diagnosis.
      </p>
    </div>
  );
}
