"use client";

import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { ProductThumb } from "@/components/app/ProductThumb";
import { useProductLink } from "@/components/app/useProductLink";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { MenuItem, Popover, Tag } from "@/components/ui/Kit";
import { formatPrice, type Product } from "@/lib/mock-data";

/** S09 card: the whole card opens the drawer; heart and "Add to plan" sit above the link layer. */
export function ProductCard({ product }: { product: Product }) {
  const productLink = useProductLink();
  const toast = useToast();
  const { city, wishlist, toggleWishlist, addToPlan, plan } = useAppState();
  const offer = [...product.offers].sort((a, b) => a.price - b.price)[0]!;
  const saved = wishlist.includes(product.id);
  const planCategory = product.category.replace(/s$/, "");

  function add(when: "morning" | "evening" | "both") {
    const replaces = [...plan.morning, ...plan.evening].some((s) => s.category === planCategory);
    addToPlan(product.id, planCategory, when);
    const where = when === "both" ? "morning and evening routines" : `${when} routine`;
    toast(replaces ? `Added to ${where}, replacing your ${planCategory.toLowerCase()}` : `Added to ${where}`);
  }

  return (
    <div className="group relative flex flex-col rounded-3xl border border-line bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_24px_44px_-30px_rgba(23,38,42,0.4)]">
      <Link href={productLink(product.id)} scroll={false} className="absolute inset-0 rounded-3xl" aria-label={`${product.brand} ${product.name}`} />

      <div className="flex items-start justify-between">
        <ProductThumb category={product.category} size={64} />
        <button
          onClick={() => toast(toggleWishlist(product.id) ? "Saved" : "Removed from wishlist")}
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          className="relative z-10 rounded-full p-2 hover:bg-canvas"
        >
          <Heart size={18} className={saved ? "fill-rose-500 text-rose-500" : "text-muted"} />
        </button>
      </div>

      <p className="mt-4 text-xs text-muted">{product.brand}</p>
      <p className="mt-0.5 line-clamp-2 text-sm leading-snug font-semibold text-ink">{product.name}</p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {!product.suitable && <Tag tone="rose">Not ideal for you</Tag>}
        {product.tags.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>
      {!product.suitable && <p className="mt-1.5 text-xs text-rose-600">{product.notSuitableReason}</p>}

      <div className="mt-auto pt-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className={`text-base font-semibold ${offer.verified ? "text-ink" : "text-muted"}`}>
              {offer.verified ? "" : "about "}
              {formatPrice(offer.price, city.currency)}
            </p>
            <p className="text-xs text-muted">{offer.store}</p>
          </div>
          <Tag tone="brand">{product.match}% match</Tag>
        </div>
        <p className="mt-2 text-[11px]">
          {offer.verified ? (
            <span className="text-muted">Price checked {offer.checked}</span>
          ) : (
            <span className="rounded bg-line px-1.5 py-0.5 text-ink-soft">Price not confirmed</span>
          )}
        </p>

        <div className="relative z-10 mt-3">
          <Popover
            align="left"
            side="top"
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-line text-sm font-medium text-ink-soft transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
              >
                <Plus size={15} /> Add to plan
              </button>
            )}
          >
            {(close) => (
              <>
                <p className="px-3 pt-1 pb-1.5 text-xs text-muted">Replaces your {planCategory.toLowerCase()} step</p>
                {(["morning", "evening", "both"] as const).map((when) => (
                  <MenuItem
                    key={when}
                    onClick={() => {
                      close();
                      add(when);
                    }}
                  >
                    {when === "both" ? "Both" : when[0]!.toUpperCase() + when.slice(1)}
                  </MenuItem>
                ))}
              </>
            )}
          </Popover>
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-line bg-white p-4">
      <div className="h-16 w-16 rounded-2xl bg-canvas" />
      <div className="mt-4 h-3 w-20 rounded bg-canvas" />
      <div className="mt-2 h-4 w-full rounded bg-canvas" />
      <div className="mt-1.5 h-4 w-2/3 rounded bg-canvas" />
      <div className="mt-6 h-5 w-24 rounded bg-canvas" />
      <div className="mt-4 h-9 w-full rounded-full bg-canvas" />
    </div>
  );
}
