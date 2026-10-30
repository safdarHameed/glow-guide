"use client";

import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { ProductThumb } from "@/components/app/ProductThumb";
import { useProductLink } from "@/components/app/useProductLink";
import { useAppState } from "@/components/providers/AppStateProvider";
import { Popover, Tag } from "@/components/ui/Kit";
import { alternatives, formatPrice, lowestPrice, productById, type PlanStep, type Product } from "@/lib/mock-data";

export function cheapestOffer(p: Product) {
  return [...p.offers].sort((a, b) => a.price - b.price)[0]!;
}

/** Next ranked options for a step, each labelled by how it differs (S11 click 4). */
export function swapOptions(step: PlanStep) {
  const current = productById(step.productId);
  if (!current) return [];
  return (alternatives[step.category] ?? [])
    .filter((id) => id !== step.productId)
    .map(productById)
    .filter((p): p is Product => Boolean(p))
    .slice(0, 3)
    .map((p) => ({
      product: p,
      label:
        lowestPrice(p) < lowestPrice(current)
          ? "Cheaper"
          : cheapestOffer(p).store !== cheapestOffer(current).store
            ? "Different store"
            : "Different texture",
    }));
}

export function PlanStepRow({
  step,
  index,
  highlighted,
  onSwap,
}: {
  step: PlanStep;
  index: number;
  highlighted: boolean;
  onSwap: (step: PlanStep, product: Product) => void;
}) {
  const productLink = useProductLink();
  const { city } = useAppState();
  const product = productById(step.productId);
  if (!product) return null;
  const offer = cheapestOffer(product);
  const options = swapOptions(step);
  const seeAllCategory = product.category;

  return (
    <li
      id={`step-${step.category.toLowerCase().replace(/\s+/g, "-")}`}
      className={`flex gap-3 rounded-2xl p-3 transition-colors ${highlighted ? "bg-sun-50 ring-2 ring-sun-300" : "hover:bg-canvas"}`}
    >
      <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">{index + 1}</span>
      <Link href={productLink(product.id)} scroll={false} className="shrink-0" aria-label={`Open ${product.name}`}>
        <ProductThumb category={product.category} size={52} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">
          {step.category}
          {!step.owned && ` · ${offer.store}`}
        </p>
        <Link href={productLink(product.id)} scroll={false} className="line-clamp-2 block text-sm font-semibold text-ink hover:text-brand-600">
          {product.brand} {product.name}
        </Link>
        <p className="mt-0.5 line-clamp-2 cursor-help text-xs text-ink-soft" title={product.why.join(" · ")}>
          {step.reason}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {step.owned ? (
          <Tag tone="brand">You own this</Tag>
        ) : (
          <span className={`text-sm font-semibold ${offer.verified ? "text-ink" : "text-muted"}`}>
            {offer.verified ? "" : "≈ "}
            {formatPrice(offer.price, city.currency)}
          </span>
        )}
        {!step.owned && (
          <Popover
            className="w-72"
            trigger={({ toggle }) => (
              <button onClick={toggle} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">
                <ArrowLeftRight size={12} /> Swap
              </button>
            )}
          >
            {(close) => (
              <div>
                <p className="px-3 pt-1 pb-2 text-xs font-semibold text-muted">Next best for {step.category.toLowerCase()}</p>
                {options.length === 0 && <p className="px-3 pb-2 text-sm text-muted">No other matches yet.</p>}
                {options.map(({ product: alt, label }) => (
                  <button
                    key={alt.id}
                    onClick={() => {
                      close();
                      onSwap(step, alt);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-canvas"
                  >
                    <ProductThumb category={alt.category} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {alt.brand} {alt.name}
                      </span>
                      <span className="text-xs text-muted">
                        {formatPrice(lowestPrice(alt), city.currency)} · {alt.match}% match
                      </span>
                    </span>
                    <Tag tone={label === "Cheaper" ? "brand" : "sky"}>{label}</Tag>
                  </button>
                ))}
                <Link
                  href={`/products?category=${encodeURIComponent(seeAllCategory)}`}
                  onClick={close}
                  className="mt-1 block rounded-xl px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
                >
                  See all {seeAllCategory.toLowerCase()}
                </Link>
              </div>
            )}
          </Popover>
        )}
      </div>
    </li>
  );
}
