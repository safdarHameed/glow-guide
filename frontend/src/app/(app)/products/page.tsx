"use client";

import { useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, Search, SearchX } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/products/ProductCard";
import { useAppState } from "@/components/providers/AppStateProvider";
import { Button } from "@/components/ui/Button";
import { Chip, EmptyState, PageHeader, Toggle } from "@/components/ui/Kit";
import { glowApi, message } from "@/lib/glow-api";
import {
  categories,
  formatPrice,
  lowestPrice,
  type Product,
  type Location,
  asCity,
  type Category,
} from "@/lib/domain";

const PAGE_SIZE = 12;

const priceRanges = {
  any: { label: "Price: any", max: Infinity, min: 0 },
  under2000: { label: "Under 2,000", max: 2000, min: 0 },
  "2000to5000": { label: "2,000 – 5,000", max: 5000, min: 2000 },
  over5000: { label: "Over 5,000", max: Infinity, min: 5000 },
} as const;
type PriceKey = keyof typeof priceRanges;

const sorts = {
  match: "Sort: best match",
  price: "Price: low to high",
  rating: "Rating",
} as const;
type SortKey = keyof typeof sorts;

function matchCategory(param: string | null): Category | "All" {
  if (!param) return "All";
  return (
    categories.find(
      (c) =>
        c.toLowerCase() === param.toLowerCase() ||
        c.replace(/s$/, "").toLowerCase() === param.toLowerCase(),
    ) ?? "All"
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsScreen />
    </Suspense>
  );
}

function ProductsScreen() {
  const params = useSearchParams();
  const { city: homeCity, mergeProducts, latestScan } = useAppState();
  const [tripCity, setTripCity] = useState<Location | null>(null);
  const city = tripCity ? asCity(tripCity) : homeCity;
  const tripId = params.get("trip");
  useEffect(() => {
    let active = true;
    setTripCity(null);
    if (tripId)
      glowApi
        .plan(tripId)
        .then((plan) => {
          if (active) setTripCity(plan.city);
        })
        .catch((err) => {
          if (active) setError(message(err));
        });
    return () => {
      active = false;
    };
  }, [tripId]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const allStores = Array.from(
    new Set(products.flatMap((p) => p.offers.map((o) => o.store))),
  );

  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">(() =>
    matchCategory(params.get("category")),
  );
  const [suitableOnly, setSuitableOnly] = useState(true);
  const [price, setPrice] = useState<PriceKey>("any");
  const [store, setStore] = useState("all");
  const [sort, setSort] = useState<SortKey>("match");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [searching, setSearching] = useState(false);
  const [updatedLabel, setUpdatedLabel] = useState("cached results");

  useEffect(() => setCategory(matchCategory(params.get("category"))), [params]);
  useEffect(() => {
    let active = true;
    setProducts([]);
    if (!city.id) return;
    glowApi
      .products(city.id)
      .then((data) => {
        if (active) {
          setProducts(data.products);
          mergeProducts(data.products);
        }
      })
      .catch((err) => {
        if (active) setError(message(err));
      });
    return () => {
      active = false;
    };
  }, [city.id, mergeProducts]);
  useEffect(
    () => setVisible(PAGE_SIZE),
    [category, suitableOnly, price, store, sort, appliedQuery],
  );

  async function runSearch(q = query) {
    if (!city.id) {
      setError("Choose a city before searching local stores.");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const data = await glowApi.search(q, city);
      setProducts(data.products);
      mergeProducts(data.products);
      setAppliedQuery("");
      setUpdatedLabel("updated just now");
    } catch (err) {
      setError(message(err));
    } finally {
      setSearching(false);
    }
  }

  const filtered = useMemo(() => {
    const q = appliedQuery.toLowerCase();
    const underMatch = q.match(/under\s*([\d,]+)/);
    const maxFromQuery = underMatch
      ? Number(underMatch[1]!.replace(/,/g, ""))
      : Infinity;
    const words = q
      .replace(/under\s*[\d,]+/, "")
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 2 && !["for", "the", "and", "with", "skin"].includes(w),
      );
    const range = priceRanges[price];

    const list = products.filter((p) => {
      const cheapest = lowestPrice(p);
      if (suitableOnly && !p.suitable) return false;
      if (category !== "All" && p.category !== category) return false;
      if (store !== "all" && !p.offers.some((o) => o.store === store))
        return false;
      if (
        cheapest < range.min ||
        cheapest > range.max ||
        cheapest > maxFromQuery
      )
        return false;
      if (words.length) {
        const hay =
          `${p.brand} ${p.name} ${p.category} ${p.tags.join(" ")} ${p.texture}`.toLowerCase();
        if (!words.some((w) => hay.includes(w.replace(/s$/, "")))) return false;
      }
      return true;
    });

    return list.sort((a, b) =>
      sort === "price"
        ? lowestPrice(a) - lowestPrice(b)
        : sort === "rating"
          ? b.rating - a.rating
          : b.match - a.match,
    );
  }, [appliedQuery, category, suitableOnly, price, store, sort, products]);

  const storeCount = new Set(
    filtered.flatMap((p) => p.offers.map((o) => o.store)),
  ).size;
  const filtersActive =
    category !== "All" ||
    price !== "any" ||
    store !== "all" ||
    appliedQuery !== "" ||
    !suitableOnly;

  function clearFilters() {
    setCategory("All");
    setPrice("any");
    setStore("all");
    setQuery("");
    setAppliedQuery("");
    setSuitableOnly(true);
  }

  const emptyLabel = category === "All" ? "products" : category.toLowerCase();
  const budgetLabel =
    price !== "any" && Number.isFinite(priceRanges[price].max)
      ? ` under ${formatPrice(priceRanges[price].max, city.currency)}`
      : "";

  return (
    <>
      <PageHeader
        title="Products"
        context={`Available in ${city.name} · ${latestScan?.skinType ?? "your skin profile"}`}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-line">
        <p className="text-sm text-ink-soft">
          {searching ? (
            <span className="flex items-center gap-2">
              <Loader2 size={15} className="animate-spin text-brand-500" />{" "}
              Checking {city.stores.slice(0, 2).join(", ")}, brand sites…
            </span>
          ) : (
            <>
              Found{" "}
              <span className="font-semibold text-ink">
                {filtered.length} products
              </span>{" "}
              from {storeCount} stores in {city.name} · {updatedLabel}
            </>
          )}
        </p>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted sm:inline">
            Prices are from store pages and may change.
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => runSearch()}
            disabled={searching}
          >
            <RefreshCw size={14} /> Search again
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch();
          }}
        >
          <Search
            size={17}
            className="absolute top-1/2 left-4 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search, e.g. "sunscreen for oily skin under 3000"'
            className="h-12 w-full rounded-2xl border border-line bg-white pr-4 pl-11 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </form>
        <div className="grid grid-cols-3 gap-2 lg:flex">
          <Select
            value={price}
            onChange={(v) => setPrice(v as PriceKey)}
            label="Price"
          >
            {Object.entries(priceRanges).map(([k, r]) => (
              <option key={k} value={k}>
                {k === "any" ? r.label : `${r.label} ({city.currency})`}
              </option>
            ))}
          </Select>
          <Select value={store} onChange={setStore} label="Store">
            <option value="all">Store: all</option>
            {allStores.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            label="Sort"
          >
            {Object.entries(sorts).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["All", ...categories] as const).map((c) => (
          <Chip
            key={c}
            selected={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </Chip>
        ))}
        <label className="ml-auto flex items-center gap-2.5 text-sm font-medium text-ink-soft">
          Suitable for me only
          <Toggle
            checked={suitableOnly}
            onChange={setSuitableOnly}
            label="Suitable for me only"
          />
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600"
        >
          {error}
        </p>
      )}
      <div className="mt-6">
        {searching ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={`No ${emptyLabel} found in ${city.name}${budgetLabel}.`}
            body="Try a wider price range or fewer filters."
            action={
              <>
                {price !== "any" && (
                  <Button onClick={() => setPrice("any")}>Raise budget</Button>
                )}
                {filtersActive && (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.slice(0, visible).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {visible < filtered.length && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                  Show more products
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 min-w-0 rounded-2xl border border-line bg-white px-3 text-sm text-ink-soft outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 lg:px-4"
    >
      {children}
    </select>
  );
}
