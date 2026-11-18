"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2, ChevronLeft, ChevronRight } from "@/components/icons";
import { listingImageUrl, thumbUrl } from "@/lib/listing-urls";
import { cn } from "@/components/ui";

/**
 * Scroll-snap slider (native swipe on phones, arrows on desktop).
 * The advertiser's QR code is always appended as the final slide.
 */
export function ImageSlider({
  paths,
  qrUrl,
  advertiserName,
  alt,
  size = "card",
  className,
  priority = false,
}: {
  paths: string[];
  qrUrl: string;
  advertiserName: string;
  alt: string;
  size?: "card" | "full";
  className?: string;
  priority?: boolean;
}) {
  const t = useTranslations("public");
  const locale = useLocale();
  const rtl = locale === "ar";
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const total = paths.length + 1;

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const next = Math.max(0, Math.min(total - 1, index + dir));
    el.scrollTo({ left: (rtl ? -1 : 1) * next * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className={cn("group relative overflow-hidden bg-divider", className)}>
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
      >
        {paths.map((p, i) => (
          <div key={p} className="relative h-full w-full shrink-0 snap-center" aria-label={t("photo", { n: i + 1, total })}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={size === "card" ? thumbUrl(p) : listingImageUrl(p)}
              alt={i === 0 ? alt : ""}
              className="size-full object-cover"
              loading={priority && i === 0 ? "eager" : "lazy"}
              fetchPriority={priority && i === 0 ? "high" : undefined}
              decoding="async"
              onError={(e) => {
                // Older uploads may not have a thumbnail — fall back to the original.
                const img = e.currentTarget;
                const full = listingImageUrl(p);
                if (img.src !== full) img.src = full;
              }}
            />
          </div>
        ))}
        {paths.length === 0 && (
          <div className="grid h-full w-full shrink-0 snap-center place-items-center bg-sky-soft text-brand">
            <Building2 className="size-12" aria-hidden />
          </div>
        )}
        {/* QR slide — always last */}
        <div className="flex h-full w-full shrink-0 snap-center flex-col items-center justify-center gap-2 bg-white p-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt={t("qrSlideTitle")} className="aspect-square h-3/5 max-h-72" loading="lazy" />
          <p className="text-[15px] font-semibold text-ink">{t("qrSlideTitle")}</p>
          <p className="text-[13px] text-muted">{t("qrSlideBody", { name: advertiserName })}</p>
        </div>
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="absolute start-2.5 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-card transition disabled:opacity-0 group-hover:grid"
            aria-label={t("prev")}
          >
            {rtl ? <ChevronRight className="size-5" aria-hidden /> : <ChevronLeft className="size-5" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index === total - 1}
            className="absolute end-2.5 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-card transition disabled:opacity-0 group-hover:grid"
            aria-label={t("next")}
          >
            {rtl ? <ChevronLeft className="size-5" aria-hidden /> : <ChevronRight className="size-5" aria-hidden />}
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-[5px]" aria-hidden>
            {Array.from({ length: Math.min(total, 8) }).map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full bg-white transition-all", i === index ? "w-4" : "w-1.5 opacity-60")} />
            ))}
          </div>
          <span className="absolute bottom-2.5 end-2.5 rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-medium leading-[18px] text-white" aria-live="polite" dir="ltr">
            {index + 1} / {total}
          </span>
        </>
      )}
    </div>
  );
}
