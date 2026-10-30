"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type Toast = { id: number; message: string; action?: { label: string; onClick: () => void } };
type ToastContextValue = { toast: (message: string, action?: Toast["action"]) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

/** Bottom-right, 6 seconds, for completed actions (blueprint rule T). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message: string, action?: Toast["action"]) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, message, action }]);
      setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-20 z-[80] flex flex-col items-end gap-2 md:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              role="status"
              className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-ink py-3 pr-3 pl-4 text-sm text-white shadow-xl"
            >
              <CheckCircle2 size={18} className="shrink-0 text-brand-300" />
              <span>{t.message}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="rounded-full px-2 py-1 font-semibold text-sun-300 hover:bg-white/10"
                >
                  {t.action.label}
                </button>
              )}
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded-full p-1 text-white/60 hover:bg-white/10">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
}
