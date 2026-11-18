import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PlanForm, type PlanRow } from "@/components/dashboard/plan-form";

export default async function AdminPlans({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("id,code,name_ar,name_en,price_monthly_aed,price_yearly_aed,max_listings,max_imports_per_day,is_active,is_public,is_coming_soon,is_default")
    .order("sort_order")
    .returns<PlanRow[]>();
  return (
    <div className="space-y-4">
      {(data ?? []).map((p) => (
        <PlanForm key={p.id} plan={{ ...p, price_monthly_aed: p.price_monthly_aed == null ? null : Number(p.price_monthly_aed), price_yearly_aed: p.price_yearly_aed == null ? null : Number(p.price_yearly_aed) }} />
      ))}
    </div>
  );
}
