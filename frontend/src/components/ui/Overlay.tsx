"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

const widths = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-3xl" };

/** Centered dialog on desktop, bottom sheet on phones. Esc, the X and the backdrop all close it. */
export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={`relative flex max-h-[90vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${widths[size]}`}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6">
              <h2 className="text-lg font-semibold text-ink">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="-mt-1 -mr-2 rounded-full p-2 text-muted hover:bg-canvas hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 pt-4 pb-6">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Right-side panel on desktop, full-screen sheet on phones. */
export function Drawer({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string }) {
  useEscape(open, onClose);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
            className="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl outline-none sm:max-w-[480px]"
          >
            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

type ConfirmProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: React.ReactNode;
  /** Names the action, never "OK" (blueprint rule C). */
  confirmLabel: string;
  destructive?: boolean;
  confirmDisabled?: boolean;
  children?: React.ReactNode;
};

export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel, destructive, confirmDisabled, children }: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="h-10 rounded-full px-4 text-sm font-medium text-ink-soft hover:bg-canvas">
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={confirmDisabled}
            className={`h-10 rounded-full px-5 text-sm font-medium text-white disabled:opacity-50 ${
              destructive ? "bg-rose-500 hover:bg-rose-600" : "bg-brand-500 hover:bg-brand-600"
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-ink-soft">{body}</div>
      {children}
    </Modal>
  );
}
