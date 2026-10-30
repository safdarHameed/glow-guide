"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { routes } from "@/lib/routes";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#ai", label: "Our AI" },
  { href: "#any-city", label: "Any city" },
  { href: "#report", label: "Skin report" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const { scrollY, scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:px-6">
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed inset-x-0 top-0 h-0.5 origin-left bg-gradient-to-r from-brand-400 via-sun-500 to-sky-500"
      />
      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`mx-auto flex max-w-page items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300 sm:px-5 ${
          scrolled
            ? "border border-white/60 bg-white/75 shadow-[0_8px_30px_-12px_rgba(23,38,42,0.18)] backdrop-blur-xl"
            : "border border-transparent bg-transparent"
        }`}
      >
        <Logo />

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-600"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href={routes.login}
            className="rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-ink-soft transition-colors hover:text-brand-600 sm:px-4"
          >
            Log in
          </Link>
          <Link
            href={routes.signup}
            className="group relative overflow-hidden rounded-full bg-brand-500 px-4 py-2 text-sm whitespace-nowrap font-medium text-white shadow-[0_6px_20px_-6px_rgba(36,105,92,0.6)] transition-all hover:-translate-y-0.5 hover:bg-brand-600"
          >
            Get started
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-1 grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-brand-50 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mt-2 max-w-page rounded-2xl border border-line bg-white/95 p-2 shadow-xl backdrop-blur-xl lg:hidden"
          >
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-600"
              >
                {l.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
