import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { imagesFor, LISTING_COLUMNS, type ListingRow as Row } from "@/lib/listings";
import { ListingForm } from "@/components/listings/listing-form";
import { ListingRow } from "@/components/listings/listing-row";
import { buttonClass, Card } from "@/components/ui";

export default async function EditListingPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { supabase, profile } = await requireUser(locale);
  const t = await getTranslations("listings");

  const { data: row } = await supabase
    .from("listings")
    .select(LISTING_COLUMNS)
    .eq("id", id)
    .eq("owner_id", profile.id)
    .maybeSingle<Row>();
  if (!row) notFound();

  let building: { id: string; title: string } | null = null;
  if (row.kind === "unit" && row.building_id) {
    const { data } = await supabase.from("listings").select("id,title").eq("id", row.building_id).single();
    building = data;
  }

  let units: Row[] = [];
  if (row.kind === "building") {
    const { data } = await supabase
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("building_id", row.id)
      .order("created_at")
      .returns<Row[]>();
    units = data ?? [];
  }
  const images = await imagesFor(supabase, [row.id, ...units.map((u) => u.id)]);

  return (
    <div className="space-y-6">
      {building && (
        <Link href={`/dashboard/listings/${building.id}/edit`} className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
          {t("backToBuilding")}: {building.title}
        </Link>
      )}

      <Card className="p-5 sm:p-8">
        <h1 className="mb-6 text-2xl font-bold text-navy">{t("editTitle")}</h1>
        <ListingForm
          mode="update"
          ownerId={profile.id}
          buildingName={building?.title}
          images={images.get(row.id) ?? []}
          values={{
            id: row.id,
            kind: row.kind,
            building_id: row.building_id,
            purpose: row.purpose,
            status: row.status,
            title: row.title,
            description: row.description,
            price_aed: row.price_aed,
            bedrooms: row.bedrooms,
            bathrooms: row.bathrooms,
            area_sqft: row.area_sqft,
            maps_url: row.maps_url,
            lat: row.lat,
            lng: row.lng,
            address_text: row.address_text,
          }}
        />
      </Card>

      {row.kind === "building" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-navy">
              {t("units")} <span className="text-base font-normal text-slate-500">({units.length})</span>
            </h2>
            <Link href={`/dashboard/listings/new?building=${row.id}`} className={buttonClass("primary")}>
              <Plus className="size-4" aria-hidden />
              {t("newUnit")}
            </Link>
          </div>
          {units.length === 0 ? (
            <Card className="text-center text-slate-600">{t("noUnits")}</Card>
          ) : (
            units.map((u) => (
              <ListingRow
                key={u.id}
                row={u}
                cover={images.get(u.id)?.[0]?.url}
                publicUrl={`${SITE_URL}/a/${profile.slug}/p/${u.id}`}
              />
            ))
          )}
        </section>
      )}
    </div>
  );
}
