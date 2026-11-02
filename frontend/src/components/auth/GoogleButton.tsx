"use client";

import { useEffect, useRef, useState } from "react";
import { authApi } from "@/lib/auth";
import { Loader2 } from "lucide-react";

type CodeClient = { requestAccessToken?: never; requestCode: () => void };
type CodeResponse = { code?: string; error?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: "popup";
            callback: (response: CodeResponse) => void;
            error_callback?: (error: { type: string }) => void;
          }) => CodeClient;
        };
      };
    };
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

function loadGis(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const script = existing ?? Object.assign(document.createElement("script"), { src: GIS_SRC, async: true });
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Google script failed to load")));
    if (!existing) document.head.appendChild(script);
  });
}

/** Google client id when the server has Google sign-in configured; `undefined` while loading, `null` when off. */
export function useGoogleClientId(): string | null | undefined {
  const [clientId, setClientId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    authApi
      .providers()
      .then((p) => setClientId(p.google.enabled ? p.google.clientId : null))
      .catch(() => setClientId(null));
  }, []);
  return clientId;
}

/**
 * Google popup (authorization-code flow). The one-time code goes to our API, which exchanges and verifies it.
 * Only rendered when the server has Google configured; if Google's script fails to load, clicking explains that.
 */
export function GoogleButton({
  clientId,
  disabled,
  onCode,
  onUnavailable,
}: {
  clientId: string;
  disabled?: boolean;
  onCode: (code: string) => Promise<void>;
  onUnavailable: (message: string) => void;
}) {
  const client = useRef<CodeClient | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadGis()
      .then(() => {
        client.current = window.google!.accounts.oauth2.initCodeClient({
          client_id: clientId,
          scope: "openid email profile",
          ux_mode: "popup",
          callback: async (response) => {
            if (!response.code) {
              setBusy(false);
              return;
            }
            try {
              await onCode(response.code);
            } finally {
              setBusy(false);
            }
          },
          error_callback: () => setBusy(false),
        });
      })
      .catch(() => {
        client.current = null;
      });
  }, [clientId, onCode]);

  function start() {
    if (!client.current) {
      onUnavailable("Google sign-in couldn't load. Please use email for now.");
      return;
    }
    setBusy(true);
    client.current.requestCode();
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled || busy}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-white text-sm font-medium text-ink transition-colors hover:border-ink/20 hover:bg-canvas disabled:opacity-60"
    >
      {busy ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
      )}
      Continue with Google
    </button>
  );
}
