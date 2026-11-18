import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { setPlanAction, setSuspendedAction } from "../actions";
import { buttonClass, Card, cn, Input } from "@/components/ui";

type Row = {
  id: string;
  display_name: string | null;
  slug: string | null;
  contact_email: string | null;
  role: string;
  is_suspended: boolean;
  created_at: string;
  subscriptions: { plan_id: string; status: string }[];
};

export default async function AdminUsers({
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
  const format = await getFormatter();
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id,display_name,slug,contact_email,role,is_suspended,created_at,subscriptions(plan_id,status)")
    .order("created_at", { ascending: false })
    .limit(100);
  const term = q?.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`display_name.ilike.%${term}%,contact_email.ilike.%${term}%,slug.ilike.%${term}%`);
  const [{ data: users }, { data: plans }, { data: counts }] = await Promise.all([
    query.returns<Row[]>(),
    supabase.from("plans").select("id,code,name_ar,name_en").order("sort_order"),
    supabase.from("listings").select("owner_id").neq("kind", "building"),
  ]);
  const countBy = new Map<string, number>();
  for (const c of counts ?? []) countBy.set(c.owner_id, (countBy.get(c.owner_id) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <form className="flex gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder={t("search")} />
        <button className={buttonClass("primary")}>{t("search").split(" ")[0]}</button>
      </form>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-page text-start text-xs text-muted">
            <tr>
              <th className="p-3 text-start">{t("name")}</th>
              <th className="p-3 text-start">{t("email")}</th>
              <th className="p-3 text-start">{t("listingsCount")}</th>
              <th className="p-3 text-start">{t("plan")}</th>
              <th className="p-3 text-start">{t("joined")}</th>
              <th className="p-3 text-start">{t("status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {(users ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  {t("noResults")}
                </td>
              </tr>
            )}
            {(users ?? []).map((u) => {
              const live = u.subscriptions.find((s) => ["active", "trialing", "past_due"].includes(s.status));
              return (
                <tr key={u.id}>
                  <td className="p-3">
                    <p className="font-medium text-navy">
                      {u.display_name ?? "—"} {u.role === "admin" && <span className="ms-1 rounded bg-navy px-1.5 py-0.5 text-[10px] text-white">admin</span>}
                    </p>
                    {u.slug && (
                      <a href={`/${locale}/a/${u.slug}`} target="_blank" rel="noopener" className="text-xs text-brand hover:underline" dir="ltr">
                        /a/{u.slug}
                      </a>
                    )}
                  </td>
                  <td className="p-3 text-muted" dir="ltr">
                    {u.contact_email}
                  </td>
                  <td className="p-3">{countBy.get(u.id) ?? 0}</td>
                  <td className="p-3">
                    <form action={setPlanAction} className="flex gap-1">
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <select name="plan_id" defaultValue={live?.plan_id} className="rounded-lg border border-line px-2 py-1.5 text-sm" aria-label={t("changePlan")}>
                        {(plans ?? []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {locale === "ar" ? p.name_ar : p.name_en}
                          </option>
                        ))}
                      </select>
                      <button className={buttonClass("secondary", "px-2.5 py-1.5 text-xs")}>{t("save")}</button>
                    </form>
                  </td>
                  <td className="p-3 text-muted">{format.dateTime(new Date(u.created_at), { dateStyle: "medium" })}</td>
                  <td className="p-3">
                    <form action={setSuspendedAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="suspended" value={u.is_suspended ? "0" : "1"} />
                      <span className={cn("rounded-full px-2 py-0.5 text-xs", u.is_suspended ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
                        {u.is_suspended ? t("suspended") : t("active")}
                      </span>
                      {u.role !== "admin" && (
                        <button className={buttonClass(u.is_suspended ? "secondary" : "danger", "px-2.5 py-1.5 text-xs")}>
                          {u.is_suspended ? t("unsuspend") : t("suspend")}
                        </button>
                      )}
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
