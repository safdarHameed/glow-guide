"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Overlay";
import { AI_ATTENTION_EVENT, type AiAttention } from "@/lib/ai-events";
import { AI_SETTINGS_HREF } from "@/lib/ai";
import { useAiStatus } from "./AiStatusProvider";

const titles: Record<string, string> = {
  AI_FREE_LIMIT_REACHED: "Free AI limit reached",
  AI_PROVIDER_LIMIT: "Your AI account hit its limit",
  AI_KEY_INVALID: "Your API key was rejected",
  AI_MODEL_UNAVAILABLE: "That model isn't available",
  AI_RECONNECT_REQUIRED: "Reconnect your AI model",
  AI_SEARCH_UNSUPPORTED: "Your model can't search the web",
  AI_NOT_CONFIGURED: "AI isn't set up yet",
};

/** Opens whenever any request fails because of the AI model, and points to connecting one. */
export function AiAttentionDialog() {
  const { reload } = useAiStatus();
  const [attention, setAttention] = useState<AiAttention | null>(null);

  useEffect(() => {
    const onAttention = (e: Event) => {
      setAttention((e as CustomEvent<AiAttention>).detail);
      void reload();
    };
    window.addEventListener(AI_ATTENTION_EVENT, onAttention);
    return () => window.removeEventListener(AI_ATTENTION_EVENT, onAttention);
  }, [reload]);

  const close = () => setAttention(null);
  const freeLimit = attention?.code === "AI_FREE_LIMIT_REACHED";

  return (
    <Modal
      open={attention !== null}
      onClose={close}
      title={attention ? (titles[attention.code] ?? "AI model needs attention") : undefined}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            Not now
          </Button>
          <ButtonLink href={`${AI_SETTINGS_HREF}&connect=1`} onClick={close}>
            {freeLimit ? "Connect a model" : "Open AI settings"}
          </ButtonLink>
        </div>
      }
    >
      <p className="text-sm text-ink-soft">{attention?.message}</p>
      {freeLimit && (
        <p className="mt-3 text-sm text-ink-soft">
          Connect ChatGPT, Gemini, Grok or any OpenAI-compatible model with your own API key. You&apos;ll get faster,
          more accurate results with no daily limit.
        </p>
      )}
    </Modal>
  );
}
