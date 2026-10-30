"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Reveal } from "@/components/ui/Motion";

const faqs = [
  {
    q: "Do I need to scan again when I move or travel?",
    a: "No. Your skin scan belongs to you; weather, stores, prices and currency belong to the place. Change city and your plan refreshes with the same skin profile.",
  },
  {
    q: "Can I trust the AI's recommendations?",
    a: "The AI only chooses from products found on real store pages, after your rules filter out anything unsuitable. It never invents products, and every pick comes with a reason that cites a real number.",
  },
  {
    q: "What does the skin scan measure?",
    a: "Eight visible features via YouCam Skin AI: moisture, oiliness, acne, pores, redness, texture, wrinkles and dark circles, each scored out of 100.",
  },
  {
    q: "Is this a medical diagnosis?",
    a: "No. GlowGuide gives cosmetic guidance only. For persistent or painful skin conditions, please see a dermatologist.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative bg-white py-24 sm:py-32">
      <div className="mx-auto grid max-w-page gap-12 px-4 sm:px-8 xl:px-12 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <p className="text-sm font-semibold tracking-wide text-brand-500 uppercase">FAQ</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Good questions</h2>
          <p className="mt-4 text-lg text-ink-soft">Everything you might want to know before your first scan.</p>
        </Reveal>
        <div className="divide-y divide-line rounded-3xl border border-line bg-canvas/40">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className={`font-medium transition-colors ${isOpen ? "text-brand-600" : "text-ink"}`}>{f.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${
                      isOpen ? "bg-brand-500 text-white" : "bg-white text-ink-soft ring-1 ring-line"
                    }`}
                  >
                    <Plus size={16} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 leading-relaxed text-ink-soft">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
