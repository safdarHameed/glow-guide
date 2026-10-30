"use client";

import { Suspense } from "react";
import { SavedScreen } from "@/components/saved/SavedScreen";

export default function SavedPage() {
  return (
    <Suspense>
      <SavedScreen />
    </Suspense>
  );
}
