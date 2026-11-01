"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Columns3,
  ExternalLink,
  Flag,
  Heart,
  Share2,
  Star,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { MenuItem, Popover, SafetyNote, Tag } from "@/components/ui/Kit";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { formatPrice, type Ingredient, type Product } from "@/lib/domain";
import { glowApi, message } from "@/lib/glow-api";
import { ProductThumb } from "./ProductThumb";

const ingredientTone = {
  good: "brand",
  neutral: "neutral",
  avoid: "rose",
} as const;

/** S10: slides over any page via ?product=<id>; closing returns to the same place. */
export function ProductDrawer() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { productById, mergeProducts } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const id = params.get("product");
  useEffect(() => {
    if (!id) return;
    let active = true;
    setError(null);
    glowApi
      .product(id)
      .then((p) => {
        if (active) mergeProducts([p]);
      })
      .catch((err) => {
        if (active) setError(message(err));
      });
    return () => {
      active = false;
    };
  }, [id, mergeProducts]);
  const product = id ? productById(id) : undefined;

  function close() {
    const next = new URLSearchParams(params.toString());
    next.delete("product");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <>
      <Drawer
        open={Boolean(id)}
        onClose={close}
        label={product?.name ?? "Product"}
      >
        {error ? (
          <p role="alert" className="p-6 text-sm text-rose-600">
            {error}
          </p>
        ) : product ? (
          <ProductDetail product={product} onClose={close} />
        ) : (
          <div className="h-80 animate-pulse bg-canvas" />
        )}
      </Drawer>
      <CompareTray />
    </>
  );
}

function ProductDetail({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const toast = useToast();
  const {
    city,
    wishlist,
    toggleWishlist,
    compare,
    toggleCompare,
    addToPlan,
    planRecord,
  } = useAppState();
  const [openIngredient, setOpenIngredient] = useState<Ingredient | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const saved = wishlist.includes(product.id);
  const offers = [...product.offers].sort((a, b) => a.price - b.price);
  const planCategory = product.category.replace(/s$/, "");

  return (
    <>
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="text-xs font-medium text-muted">
          {product.category.replace(/s$/, "")} · {product.size}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              void toggleWishlist(product.id).then((added) => {
                if (added !== null)
                  toast(added ? "Saved to wishlist" : "Removed from wishlist");
              })
            }
            aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
            className="rounded-full p-2 hover:bg-canvas"
          >
            <Heart
              size={18}
              className={saved ? "fill-rose-500 text-rose-500" : "text-muted"}
            />
          </button>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.href);
              toast("Link copied");
            }}
            aria-label="Copy link"
            className="rounded-full p-2 text-muted hover:bg-canvas"
          >
            <Share2 size={18} />
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-muted hover:bg-canvas"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <div className="flex gap-4">
          <ProductThumb category={product.category} size={84} />
          <div>
            <p className="text-sm text-muted">{product.brand}</p>
            <h2 className="text-lg leading-snug font-semibold text-ink">
              {product.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Tag tone="brand">{product.match}% match</Tag>
              <span className="flex items-center gap-1 text-xs text-muted">
                <Star size={13} className="fill-sun-500 text-sun-500" />{" "}
                {product.rating} · {product.reviews} reviews
              </span>
            </div>
          </div>
        </div>

        {!product.suitable && (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            Not ideal for you: {product.notSuitableReason}
          </p>
        )}

        <section>
          <h3 className="text-sm font-semibold text-ink">Why it fits you</h3>
          <ul className="mt-2 space-y-2">
            {product.why.map((w) => (
              <li key={w} className="flex gap-2 text-sm text-ink-soft">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />{" "}
                {w}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-ink">Key ingredients</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {(showAll
              ? product.ingredients
              : product.ingredients.slice(0, 3)
            ).map((ing) => (
              <button
                key={ing.name}
                onClick={() =>
                  setOpenIngredient(
                    openIngredient?.name === ing.name ? null : ing,
                  )
                }
              >
                <Tag
                  tone={ingredientTone[ing.tone]}
                  className="cursor-pointer hover:ring-1 hover:ring-current"
                >
                  {ing.name}
                </Tag>
              </button>
            ))}
            {product.ingredients.length > 3 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                See all {product.ingredients.length}
              </button>
            )}
          </div>
          {openIngredient && (
            <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-xs text-ink-soft">
              {openIngredient.note}
            </p>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-ink">
            Where to buy in {city.name}
          </h3>
          <ul className="mt-2 space-y-2">
            {offers.map((o) => (
              <li
                key={o.store}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{o.store}</p>
                  <p className="text-xs text-muted">
                    Delivery {o.delivery} ·{" "}
                    {o.verified
                      ? `price checked ${o.checked}`
                      : "price not confirmed"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-semibold ${o.verified ? "text-ink" : "text-muted"}`}
                  >
                    {o.verified ? "" : "≈ "}
                    {formatPrice(o.price, o.currency ?? city.currency)}
                  </span>
                  <a
                    href={o.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1 rounded-full bg-ink px-3.5 text-sm font-medium text-white hover:bg-ink-soft"
                  >
                    Buy <ExternalLink size={13} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">
            Prices are from store pages and may change. GlowGuide doesn&apos;t
            handle payment.
          </p>
        </section>

        <SafetyNote>
          Cosmetic suggestion only. Patch-test new products.
        </SafetyNote>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4">
        <Popover
          align="left"
          side="top"
          trigger={({ toggle }) => (
            <Button
              onClick={toggle}
              className="flex-1"
              disabled={!product.suitable || !planRecord}
            >
              Add to plan
            </Button>
          )}
        >
          {(close) =>
            (["morning", "evening", "both"] as const).map((when) => (
              <MenuItem
                key={when}
                onClick={async () => {
                  close();
                  if (!(await addToPlan(product.id, planCategory, when)))
                    return;
                  toast(
                    `Added to ${when === "both" ? "morning and evening routines" : `${when} routine`}`,
                  );
                }}
              >
                {when === "both"
                  ? "Both"
                  : when[0]!.toUpperCase() + when.slice(1)}
              </MenuItem>
            ))
          }
        </Popover>
        <Button
          variant="secondary"
          onClick={() => {
            if (!compare.includes(product.id) && compare.length >= 3)
              return toast("You can compare up to 3 products");
            toggleCompare(product.id);
          }}
        >
          <Columns3 size={16} />{" "}
          {compare.includes(product.id) ? "In compare" : "Compare"}
        </Button>
        <button
          onClick={() => setReportOpen(true)}
          className="flex items-center gap-1 px-2 text-xs text-muted hover:text-ink"
        >
          <Flag size={13} /> Report wrong info
        </button>
      </div>

      <ReportWrongInfo
        productId={product.id}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}

function ReportWrongInfo({
  productId,
  open,
  onClose,
}: {
  productId: string;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState("Wrong price");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report wrong info"
      size="sm"
      footer={
        <Button
          onClick={async () => {
            try {
              await glowApi.report(productId, reason);
              onClose();
              toast("Thanks, this product is marked for re-checking");
            } catch (err) {
              toast(message(err));
            }
          }}
        >
          Send report
        </Button>
      }
    >
      <div className="space-y-2">
        {["Wrong price", "Out of stock", "Wrong ingredients"].map((r) => (
          <label
            key={r}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50"
          >
            <input
              type="radio"
              name="reason"
              checked={reason === r}
              onChange={() => setReason(r)}
              className="accent-brand-500"
            />{" "}
            {r}
          </label>
        ))}
      </div>
    </Modal>
  );
}

/** Compare tray at the bottom of the screen (max 3) with a side-by-side table. */
function CompareTray() {
  const { compare, toggleCompare, clearCompare, city, productById } =
    useAppState();
  const [open, setOpen] = useState(false);
  const items = compare
    .map(productById)
    .filter((p): p is Product => Boolean(p));
  if (items.length === 0) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-16 z-40 flex justify-center px-4 md:bottom-6">
        <div className="flex max-w-full items-center gap-3 overflow-x-auto rounded-2xl bg-ink px-4 py-3 text-white shadow-2xl">
          <span className="text-sm font-medium whitespace-nowrap">
            Compare ({items.length}/3)
          </span>
          {items.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1 rounded-full bg-white/10 py-1 pr-1 pl-3 text-xs whitespace-nowrap"
            >
              {p.brand}
              <button
                onClick={() => toggleCompare(p.id)}
                aria-label={`Remove ${p.brand}`}
                className="rounded-full p-1 hover:bg-white/10"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            disabled={items.length < 2}
          >
            Compare now
          </Button>
          <button
            onClick={clearCompare}
            className="text-xs text-white/60 hover:text-white"
          >
            Clear
          </button>
        </div>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Compare products"
        size="lg"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-2 pr-4 font-medium" />
                {items.map((p) => (
                  <th key={p.id} className="py-2 pr-4 font-semibold text-ink">
                    {p.brand}
                    <span className="block text-xs font-normal text-muted">
                      {p.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                [
                  "Price",
                  (p: Product) =>
                    formatPrice(
                      Math.min(...p.offers.map((o) => o.price)),
                      city.currency,
                    ),
                ],
                ["Match", (p: Product) => `${p.match}%`],
                ["Texture", (p: Product) => p.texture],
                [
                  "Key ingredients",
                  (p: Product) => p.ingredients.map((i) => i.name).join(", "),
                ],
              ].map(([label, get]) => (
                <tr key={label as string}>
                  <td className="py-3 pr-4 text-muted">{label as string}</td>
                  {items.map((p) => (
                    <td key={p.id} className="py-3 pr-4 text-ink">
                      {(get as (p: Product) => string)(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
