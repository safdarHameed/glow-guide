"use client";

import { Suspense } from "react";
import { SettingsScreen } from "@/components/settings/SettingsScreen";

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsScreen />
    </Suspense>
  );
}
