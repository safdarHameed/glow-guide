"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Builds `?product=<id>` on the current page, so the detail drawer opens without losing the user's place. */
export function useProductLink() {
  const pathname = usePathname();
  const params = useSearchParams();
  return useCallback(
    (id: string) => {
      const next = new URLSearchParams(params.toString());
      next.set("product", id);
      return `${pathname}?${next.toString()}`;
    },
    [pathname, params],
  );
}
