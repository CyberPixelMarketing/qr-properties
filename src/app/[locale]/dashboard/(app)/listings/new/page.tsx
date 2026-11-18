import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { ListingForm } from "@/components/listings/listing-form";

export default async function NewListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string; building?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { kind: rawKind, building } = await searchParams;
  const { supabase, profile } = await requireUser(locale);
  const t = await getTranslations("listings");

  const kind = building ? "unit" : rawKind === "building" ? "building" : "apartment";
  let buildingName: string | null = null;
  let buildingAddress: string | null = null;
  if (kind === "unit") {
    const { data: b } = await supabase
      .from("listings")
      .select("id,title,kind,address_text")
      .eq("id", building!)
      .eq("owner_id", profile.id)
      .maybeSingle();
    if (!b || b.kind !== "building") notFound();
    buildingName = b.title;
    buildingAddress = b.address_text;
  }

  const heading = kind === "unit" ? t("newUnit") : kind === "building" ? t("newBuilding") : t("newApartment");

  return (
    <Card className="p-5 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold text-navy">{heading}</h1>
      <ListingForm
        mode="create"
        ownerId={profile.id}
        buildingName={buildingName}
        images={[]}
        values={{
          id: crypto.randomUUID(),
          kind,
          building_id: kind === "unit" ? building! : null,
          purpose: kind === "building" ? null : "sale",
          status: "draft",
          title: "",
          description: null,
          price_aed: null,
          bedrooms: null,
          bathrooms: null,
          area_sqft: null,
          maps_url: null,
          lat: null,
          lng: null,
          address_text: buildingAddress,
        }}
      />
    </Card>
  );
}
