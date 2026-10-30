import Link from "next/link";
import { ArrowRight, Camera, FileText } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";
import { routes } from "@/lib/routes";

export function FinalCTA() {
  return (
    <section className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-page px-4 sm:px-8 xl:px-12">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 px-6 py-16 text-center text-white sm:px-12 sm:py-20">
            <div className="animate-blob pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-sun-300/35 blur-3xl" />
            <div className="animate-blob pointer-events-none absolute -right-16 -bottom-28 h-80 w-80 rounded-full bg-sky-300/30 blur-3xl [animation-delay:-8s]" />
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

            <div className="relative">
              <h2 className="mx-auto max-w-3xl font-serif text-4xl font-semibold tracking-tight sm:text-6xl">
                One scan. Every city you live in or travel to.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">
                Your skin profile is saved once and reused whenever your weather changes. Free to start.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={routes.startScan}
                  className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-7 py-4 font-medium text-brand-700 shadow-xl transition-all hover:-translate-y-0.5 sm:w-auto"
                >
                  <Camera size={18} />
                  Start free scan
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href={routes.sampleReport}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-4 font-medium text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/20 sm:w-auto"
                >
                  <FileText size={18} />
                  See a sample report
                </Link>
              </div>
              <p className="mt-6 text-sm text-white/70">
                Already have an account?{" "}
                <Link href={routes.login} className="font-semibold text-white underline-offset-4 hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
