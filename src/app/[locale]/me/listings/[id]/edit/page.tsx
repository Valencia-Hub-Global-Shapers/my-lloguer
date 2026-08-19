import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getListingForOwnerOrAdmin,
  getNeighborhoods,
} from "@/features/listings/server/queries";
import { requireUser } from "@/features/auth/server/session";
import { ListingForm } from "@/features/listings/components/listing-form";
import { parseGeoPoint } from "@/features/listings/types";
import { VALENCIA_CENTER } from "@/lib/utils";
import type { Locale } from "@/i18n/config";
import type { ListingFormValues } from "@/features/listings/schemas";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const current = await requireUser(locale, `/${locale}/me/listings/${id}/edit`);

  const supabase = await createClient();
  const listing = await getListingForOwnerOrAdmin(supabase, id).catch(() => null);
  if (!listing || listing.owner_id !== current.userId) notFound();
  if (listing.status === "deleted") notFound();

  const neighborhoods = await getNeighborhoods(supabase).catch(() => []);
  const point = parseGeoPoint(listing.location);

  const defaults: ListingFormValues = {
    type: listing.type,
    lat: point?.lat ?? VALENCIA_CENTER[1],
    lng: point?.lng ?? VALENCIA_CENTER[0],
    neighborhood: listing.neighborhood ?? "",
    municipality: listing.municipality,
    price: listing.price,
    description: listing.description,
    available_from: listing.available_from ?? "",
    bills_included: listing.bills_included,
    deposit: listing.deposit,
    flatmates: listing.flatmates,
    preferred_gender: listing.preferred_gender,
    room_type: listing.room_type,
    pets: listing.pets,
    smokers: listing.smokers,
    tenant_pref: listing.tenant_pref,
    bathrooms: listing.bathrooms,
    bedrooms: listing.bedrooms,
    contact_whatsapp: listing.contact_whatsapp ?? "",
    contact_external: listing.contact_external ?? "",
    photos: listing.photos,
  };

  return (
    <ListingForm
      mode="edit"
      userId={current.userId}
      listingId={listing.id}
      neighborhoods={neighborhoods}
      defaults={defaults}
    />
  );
}
