import { NextResponse, type NextRequest } from "next/server";

// gg_session is a non-secret hint cookie set by the API alongside the httpOnly tokens.
// It only decides where to route; real access is enforced by the API (and re-checked by AuthGate).
const SESSION_HINT = "gg_session";

const PROTECTED = ["/dashboard", "/onboarding", "/scan", "/report", "/environment", "/products", "/plan", "/trip", "/saved", "/settings"];
const PUBLIC_EXCEPTIONS = ["/report/demo"];

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_HINT);

  if (matches(pathname, PROTECTED) && !matches(pathname, PUBLIC_EXCEPTIONS) && !signedIn) {
    const url = new URL("/auth", request.url);
    url.searchParams.set("mode", "login");
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // Signed-in visitors skip the landing page and the auth form.
  if ((pathname === "/" || pathname === "/auth") && signedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icon.svg|.*\\..*).*)"],
};
