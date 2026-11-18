export type PublicItem = {
  id: string;
  kind: "apartment" | "building" | "unit";
  building_id: string | null;
  purpose: "sale" | "rent" | null;
  title: string;
  price_aed: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  address_text: string | null;
  lat: number | null;
  lng: number | null;
  image_paths: string[];
  published_at: string | null;
};

export type Advertiser = {
  slug: string;
  name: string;
  logoUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
};
