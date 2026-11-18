import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  // Locale lives in the URL (/ar, /en). Printed QR codes point at /a/<slug>
  // with no locale; the middleware redirects using the phone's language.
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

export const localeDir = (locale: string): "rtl" | "ltr" => (locale === "ar" ? "rtl" : "ltr");
