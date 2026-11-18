import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Bath, BarChart3, BedDouble, Building2, Eye, EyeOff, Maximize2, Pencil } from "lucide-react";
import { setListingStatusAction } from "@/app/[locale]/dashboard/(app)/listings/actions";
import { buttonClass, cn } from "@/components/ui";
import { formatAed, type ListingRow as Row } from "@/lib/listings";
import { CopyLinkButton, DeleteListingButton } from "./row-actions";

const statusTone = {
  published: "bg-green-50 text-green-700 ring-green-200",
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  hidden: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;

export async function ListingRow({
  row,
  cover,
  publicUrl,
  unitsCount,
  views,
}: {
  row: Row;
  cover?: string;
  publicUrl: string;
  unitsCount?: number;
  views?: number;
}) {
  const t = await getTranslations("listings");
  const ts = await getTranslations("stats");
  const locale = await getLocale();
  const nextStatus = row.status === "published" ? "hidden" : "published";

  return (
    <article className="flex gap-3 rounded-card border border-slate-200 bg-white p-3 shadow-sm sm:gap-4">
      <Link href={`/dashboard/listings/${row.id}/edit`} className="relative block aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-sky-soft sm:w-40">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <span className="grid size-full place-items-center text-brand">
            <Building2 className="size-8" aria-hidden />
          </span>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-full bg-sky-soft px-2 py-0.5 font-medium text-brand">{t(`kind.${row.kind}`)}</span>
          {row.purpose && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{t(`purpose.${row.purpose}`)}</span>}
          <span className={cn("rounded-full px-2 py-0.5 ring-1", statusTone[row.status])}>{t(`status.${row.status}`)}</span>
          {views != null && views > 0 && (
            <span className="inline-flex items-center gap-1 text-slate-500" title={ts("views", { n: views })}>
              <BarChart3 className="size-3.5" aria-hidden />
              {views}
            </span>
          )}
        </div>
        <Link href={`/dashboard/listings/${row.id}/edit`} className="mt-1 line-clamp-1 font-bold text-navy hover:underline">
          {row.title}
        </Link>
        {row.kind === "building" ? (
          <p className="text-sm text-slate-600">{t("unitsCount", { count: unitsCount ?? 0 })}</p>
        ) : (
          <>
            {row.price_aed != null && <p className="text-lg font-bold text-brand">{formatAed(row.price_aed, locale)}</p>}
            <p className="flex flex-wrap gap-3 text-xs text-slate-600">
              {row.bedrooms != null && (
                <span className="inline-flex items-center gap-1">
                  <BedDouble className="size-3.5" aria-hidden /> {row.bedrooms === 0 ? t("studio") : row.bedrooms}
                </span>
              )}
              {row.bathrooms != null && (
                <span className="inline-flex items-center gap-1">
                  <Bath className="size-3.5" aria-hidden /> {row.bathrooms}
                </span>
              )}
              {row.area_sqft != null && (
                <span className="inline-flex items-center gap-1">
                  <Maximize2 className="size-3.5" aria-hidden /> {Number(row.area_sqft).toLocaleString(locale)}
                </span>
              )}
            </p>
          </>
        )}
        <div className="mt-auto flex items-center gap-1 pt-2">
          <Link href={`/dashboard/listings/${row.id}/edit`} className={buttonClass("secondary", "px-3 py-2")}>
            <Pencil className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t("edit")}</span>
          </Link>
          {row.status !== "draft" && (
            <form action={setListingStatusAction}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="status" value={nextStatus} />
              <button className={buttonClass("ghost", "px-2.5 py-2")} title={nextStatus === "hidden" ? t("hide") : t("show")} aria-label={nextStatus === "hidden" ? t("hide") : t("show")}>
                {nextStatus === "hidden" ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </form>
          )}
          {row.status === "published" && <CopyLinkButton url={publicUrl} />}
          <DeleteListingButton id={row.id} isBuilding={row.kind === "building"} />
        </div>
      </div>
    </article>
  );
}
