"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Logo, LogoMark } from "@/components/ui/Logo";
import { AppShell } from "./AppShell";

const DEMO_PATH = "/report/demo";
const BARE_PATHS = ["/onboarding"];

/**
 * Every app screen renders through here. Nothing protected is shown until /api/auth/me succeeds;
 * the middleware redirect is only a fast path, this is the real check.
 */
export function AppGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, reload } = useAuth();
  const isDemo = pathname === DEMO_PATH;

  useEffect(() => {
    if (status === "unauthenticated" && !isDemo) {
      const next = encodeURIComponent(pathname + window.location.search);
      router.replace(`/auth?mode=login&next=${next}`);
    }
  }, [status, isDemo, pathname, router]);

  if (isDemo && status !== "authenticated" && status !== "loading") {
    return <DemoFrame>{children}</DemoFrame>;
  }

  if (status === "unreachable") {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-4">
        <div className="max-w-sm text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sun-50 text-sun-600">
            <WifiOff size={26} />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-ink">Live data is unavailable</h1>
          <p className="mt-2 text-sm text-muted">We can&apos;t reach GlowGuide right now. We&apos;ll pick up where you left off once the connection is back.</p>
          <Button className="mt-6" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas" aria-busy="true" aria-label="Loading">
        <LogoMark className="h-12 w-12 animate-pulse" />
      </div>
    );
  }

  if (BARE_PATHS.some((p) => pathname.startsWith(p))) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}

function DemoFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur sm:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/auth?mode=login" className="hidden px-3 text-sm font-medium text-ink-soft hover:text-brand-600 sm:block">
            Log in
          </Link>
          <ButtonLink href="/auth?mode=signup&intent=scan" size="sm">
            Get my own report
          </ButtonLink>
        </div>
      </header>
      <div className="bg-sun-50 px-4 py-2 text-center text-xs font-medium text-sun-700">Demo mode · sample data, read-only</div>
      <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
