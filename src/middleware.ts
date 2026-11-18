import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intl = createIntlMiddleware(routing);
const PROTECTED = /^\/(ar|en)\/(dashboard|admin)(\/|$)/;

export async function middleware(request: NextRequest) {
  const intlResponse = intl(request);
  // Locale redirects (e.g. QR hits /a/<slug>?src=qr) go straight out, query preserved.
  if (intlResponse.headers.get("location")) return intlResponse;

  const { response, user } = await updateSession(request, intlResponse);

  const { pathname, search } = request.nextUrl;
  if (!user && PROTECTED.test(pathname)) {
    const locale = pathname.split("/")[1];
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Skip API routes, auth callback, Next internals and static files.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
