import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatAed } from "@/lib/listing-urls";
import { adminDeleteListingAction, adminListingStatusAction } from "../actions";
import { ConfirmSubmit } from "@/components/dashboard/confirm-submit";
import { buttonClass, Card, cn, Input } from "@/components/ui";

type Row = {
  id: string;
  kind: string;
  status: "draft" | "published" | "hidden";
  title: string;
  price_aed: number | null;
  created_at: string;
  owner: { display_name: string | null; slug: string | null } | null;
};

export default async function AdminListings({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;
  const t = await getTranslations("admin");
  const tl = await getTranslations("listings");
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select("id,kind,status,title,price_aed,created_at,owner:profiles!listings_owner_id_fkey(display_name,slug)")
    .order("created_at", { ascending: false })
    .limit(150);
  const term = q?.trim().replace(/[%,()]/g, "");
  if (term) query = query.ilike("title", `%${term}%`);
  const { data: rows } = await query.returns<Row[]>();

  return (
    <div className="space-y-4">
      <form className="flex gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder={t("search")} />
        <button className={buttonClass("primary")}>{t("search").split(" ")[0]}</button>
      </form>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-page text-xs text-muted">
            <tr>
              <th className="p-3 text-start">{tl("titleLabel")}</th>
              <th className="p-3 text-start">{t("owner")}</th>
              <th className="p-3 text-start">{tl("price")}</th>
              <th className="p-3 text-start">{t("status")}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted">
                  {t("noResults")}
                </td>
              </tr>
            )}
            {(rows ?? []).map((r) => (
              <tr key={r.id}>
                <td className="p-3">
                  <p className="line-clamp-1 font-medium text-navy">{r.title}</p>
                  <p className="text-xs text-muted">{tl(`kind.${r.kind}` as never)}</p>
                </td>
                <td className="p-3">
                  {r.owner?.slug ? (
                    <a href={`/${locale}/a/${r.owner.slug}`} target="_blank" rel="noopener" className="text-brand hover:underline">
                      {r.owner.display_name}
                    </a>
                  ) : (
                    r.owner?.display_name ?? "—"
                  )}
                </td>
                <td className="p-3">{formatAed(r.price_aed, locale)}</td>
                <td className="p-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      r.status === "published" ? "bg-green-50 text-green-700" : r.status === "draft" ? "bg-amber-50 text-amber-700" : "bg-divider text-muted",
                    )}
                  >
                    {tl(`status.${r.status}`)}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    {r.status !== "draft" && (
                      <form action={adminListingStatusAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="status" value={r.status === "published" ? "hidden" : "published"} />
                        <button className={buttonClass("secondary", "px-2.5 py-1.5 text-xs")}>
                          {r.status === "published" ? t("hide") : t("publish")}
                        </button>
                      </form>
                    )}
                    <form action={adminDeleteListingAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <ConfirmSubmit message={t("deleteConfirm")} className={buttonClass("danger", "px-2.5 py-1.5 text-xs")}>
                        {t("delete")}
                      </ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
