import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { routes } from "@/lib/routes";

const columns = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Any city", href: "#any-city" },
      { label: "Skin report", href: "#report" },
      { label: "Sample report", href: routes.sampleReport },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Create account", href: routes.signup },
      { label: "Log in", href: routes.login },
      { label: "Start free scan", href: routes.startScan },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: routes.privacy },
      { label: "Terms", href: routes.terms },
      { label: "FAQ", href: "#faq" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-page gap-10 px-4 py-14 sm:px-8 xl:px-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Skincare that knows your face and your weather. Skin analysis by YouCam Skin AI, weather and air quality by
            Open-Meteo.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-ink">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-muted transition-colors hover:text-brand-500">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-page flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 xl:px-12">
          <p>© 2026 GlowGuide. Cosmetic guidance only, not a medical diagnosis.</p>
          <p>Built for the YouCam API Hackathon 2026</p>
        </div>
      </div>
    </footer>
  );
}
