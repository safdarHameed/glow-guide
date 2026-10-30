import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { MotionProvider } from "@/components/ui/Motion";

export const metadata: Metadata = { title: "Sign up or log in · GlowGuide" };

export default function AuthPage() {
  return (
    <MotionProvider>
      <Suspense>
        <AuthScreen />
      </Suspense>
    </MotionProvider>
  );
}
