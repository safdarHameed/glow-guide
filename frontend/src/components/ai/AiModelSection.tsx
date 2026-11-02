"use client";

import { ExternalLink, Globe, KeyRound, Lock, Sparkles } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Card, Tag } from "@/components/ui/Kit";
import { ConfirmDialog } from "@/components/ui/Overlay";
import { ApiError } from "@/lib/api";
import { emitAiChanged } from "@/lib/ai-events";
import { aiApi, modelLabel, type AiProviderId, type AiProviderInfo } from "@/lib/ai";
import { FreeUsage } from "./AiModelBadge";
import { useAiStatus } from "./AiStatusProvider";

const blurbs: Record<AiProviderId, string> = {
  openai: "GPT models with web search",
  gemini: "Gemini models with Google Search",
  xai: "Grok models with web search",
  custom: "Any OpenAI-compatible API",
};

type Errors = Partial<Record<"apiKey" | "baseUrl" | "model" | "form", string>>;

/** Settings → AI model: see the active model, and connect ChatGPT, Gemini, Grok or a custom endpoint. */
export function AiModelSection() {
  const toast = useToast();
  const { status, reload } = useAiStatus();
  const modelListId = useId();

  const active = status?.active ?? null;
  const own = active?.tier === "own" ? active : null;
  const [provider, setProvider] = useState<AiProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  // Start the form on the connected provider so changing only the model is one step.
  useEffect(() => {
    if (!own) return;
    setProvider(own.provider);
    setModel(own.model);
    setBaseUrl(own.baseUrl ?? "");
  }, [own?.provider, own?.model, own?.baseUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!status) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-ink">AI model</h2>
        <div className="mt-5 h-24 animate-pulse rounded-2xl bg-canvas" />
      </Card>
    );
  }

  const info = status.providers.find((p) => p.id === provider) as AiProviderInfo;
  const keepsSavedKey = own?.provider === provider && !own.needsReconnect;

  function pick(id: AiProviderId) {
    setProvider(id);
    setModels([]);
    setErrors({});
    setApiKey("");
    setModel(own?.provider === id ? own.model : "");
    setBaseUrl(own?.provider === id ? (own.baseUrl ?? "") : "");
  }

  function fail(err: unknown) {
    if (err instanceof ApiError) {
      const fields = err.fields ?? {};
      setErrors({ ...fields, form: Object.keys(fields).length ? undefined : err.message });
    } else {
      setErrors({ form: "Something went wrong. Please try again." });
    }
  }

  async function loadModels() {
    setErrors({});
    if (!apiKey.trim()) return setErrors({ apiKey: "Enter your API key to see its models." });
    setLoadingModels(true);
    try {
      const { models } = await aiApi.models({ provider, apiKey: apiKey.trim(), baseUrl: baseUrl.trim() || undefined });
      setModels(models);
      if (!models.length) setErrors({ model: "No text models found for this key. Type a model name instead." });
      else if (!models.includes(model)) setModel(models[0]!);
    } catch (err) {
      fail(err);
    } finally {
      setLoadingModels(false);
    }
  }

  async function connect() {
    setErrors({});
    if (!keepsSavedKey && !apiKey.trim()) return setErrors({ apiKey: "Enter your API key." });
    if (!model.trim()) return setErrors({ model: "Choose or type a model." });
    setSaving(true);
    try {
      await aiApi.connect({
        provider,
        model: model.trim(),
        apiKey: apiKey.trim() || undefined,
        baseUrl: info.needsBaseUrl ? baseUrl.trim() : undefined,
      });
      setApiKey("");
      await reload();
      toast(`Connected · ${modelLabel(model.trim())}`);
    } catch (err) {
      fail(err);
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    setConfirmDisconnect(false);
    try {
      await aiApi.disconnect();
      emitAiChanged();
      await reload();
      toast(status?.free.available ? "Switched to the free model" : "Model disconnected");
    } catch (err) {
      fail(err);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-ink">AI model</h2>
      <p className="mt-1 text-sm text-muted">
        Product search, ranking and routines use this model. Your skin scan always uses YouCam Skin AI.
      </p>

      {/* Active model */}
      <div className="mt-5 rounded-2xl border border-line p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${own ? "bg-brand-50 text-brand-600" : "bg-sun-50 text-sun-700"}`}>
              <Sparkles size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Active now</p>
              {active ? (
                <>
                  <p className="text-sm font-semibold text-ink">
                    {active.providerName} · {modelLabel(active.model)}
                  </p>
                  <p className="text-xs text-muted">
                    {active.model}
                    {active.keyHint && ` · key ending in ${active.keyHint}`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-ink-soft">No model. Connect one below.</p>
              )}
            </div>
          </div>
          {own ? (
            <div className="flex items-center gap-2">
              <Tag tone="brand">Your key</Tag>
              <Button size="sm" variant="secondary" onClick={() => setConfirmDisconnect(true)}>
                {status.free.available ? "Use free model" : "Disconnect"}
              </Button>
            </div>
          ) : (
            active && <Tag tone="sun">Free</Tag>
          )}
        </div>
        {own?.needsReconnect && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
            Your saved key can&apos;t be used any more. Enter it again below to reconnect.
          </p>
        )}
        {own && !own.webSearch && (
          <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-600">
            This endpoint can&apos;t search the web, so finding new products uses the free model; your model ranks
            them and writes your routine.
          </p>
        )}
        {active?.tier === "free" && <FreeUsage free={status.free} />}
      </div>

      {/* Connect */}
      <h3 className="mt-8 text-sm font-semibold text-ink">{own ? "Change model" : "Connect your own model"}</h3>
      <p className="mt-0.5 text-xs text-muted">Use your own API key for faster, more accurate results with no daily limit.</p>

      <div role="radiogroup" aria-label="Provider" className="mt-4 grid gap-2 sm:grid-cols-2">
        {status.providers.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={provider === p.id}
            onClick={() => pick(p.id)}
            className={`rounded-2xl border p-3.5 text-left transition-colors ${
              provider === p.id ? "border-brand-400 bg-brand-50/60 ring-2 ring-brand-100" : "border-line hover:border-brand-200"
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{p.name}</span>
              {own?.provider === p.id && <Tag tone="brand">Connected</Tag>}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              {p.webSearch && <Globe size={12} />}
              {blurbs[p.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {info.needsBaseUrl && (
          <Field
            label="API base URL"
            placeholder="https://api.example.com/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            error={errors.baseUrl}
            hint="The address before /chat/completions. Must be public HTTPS."
            autoComplete="off"
          />
        )}
        <div>
          <Field
            label="API key"
            type="password"
            placeholder={keepsSavedKey ? `Saved key ending in ${own?.keyHint} (leave blank to keep)` : info.keyPlaceholder}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            error={errors.apiKey}
            autoComplete="off"
          />
          {info.keyUrl && (
            <a
              href={info.keyUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
            >
              <KeyRound size={12} /> Get a {info.name} API key <ExternalLink size={11} />
            </a>
          )}
        </div>
        <div>
          <div className="flex items-end gap-2">
            <Field
              className="flex-1"
              label="Model"
              placeholder={models.length ? "Choose a model" : "Load models or type a name"}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              error={errors.model}
              list={modelListId}
              autoComplete="off"
            />
            <Button variant="secondary" onClick={loadModels} loading={loadingModels} className={errors.model ? "mb-6" : ""}>
              Load models
            </Button>
          </div>
          <datalist id={modelListId}>
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          {models.length > 0 && <p className="mt-1.5 text-xs text-muted">{models.length} models available with this key.</p>}
        </div>
      </div>

      {errors.form && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{errors.form}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Lock size={12} /> Keys are encrypted on our server, used only for your requests, and never shown again.
        </p>
        <Button onClick={connect} loading={saving}>
          Test and connect
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={disconnect}
        title={status.free.available ? "Switch to the free model?" : "Disconnect this model?"}
        body={
          status.free.available
            ? "Your saved key will be deleted. The free model is limited per day and can be less accurate."
            : "Your saved key will be deleted. AI features stop working until you connect a model."
        }
        confirmLabel={status.free.available ? "Use free model" : "Disconnect"}
      />
    </Card>
  );
}
