"use client";

import { Suspense } from "react";
import { TripPlanner } from "@/components/trip/TripPlanner";

export default function TripPage() {
  return (
    <Suspense>
      <TripPlanner />
    </Suspense>
  );
}
