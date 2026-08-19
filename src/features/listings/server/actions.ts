"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { err, ok, type Result } from "@/lib/result";
import { listingFormSchema, type ListingFormInput } from "../schemas";

function listingRow(values: ListingFormInput, ownerId: string) {
  return {
    owner_id: ownerId,
    type: values.type,
    price: values.price,
    neighborhood: values.neighborhood,
    municipality: values.municipality,
    location: `SRID=4326;POINT(${values.lng} ${values.lat})`,
    flatmates: values.flatmates ?? null,
    preferred_gender: values.preferred_gender,
    description: values.description,
    available_from: values.available_from || null,
    bills_included: values.bills_included,
    deposit: values.deposit ?? null,
    room_type: values.type === "room" ? values.room_type : null,
    pets: values.pets,
    smokers: values.smokers,
    tenant_pref: values.tenant_pref,
    contact_external: values.contact_external || null,
    contact_whatsapp: values.contact_whatsapp || null,
    bathrooms: values.bathrooms ?? null,
    bedrooms: values.type === "full_flat" ? values.bedrooms : null,
    photos: values.photos,
  };
}

export async function createListing(
  input: ListingFormInput,
): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("errors.unauthorized");

  if (!(await checkRateLimit("publish", user.id))) return err("errors.rateLimited");

  const parsed = listingFormSchema.safeParse(input);
  if (!parsed.success) return err("errors.validation");

  const { data, error } = await supabase
    .from("listings")
    .insert({ ...listingRow(parsed.data, user.id), status: "pending" })
    .select("id")
    .single();

  if (error) {
    console.error("createListing failed:", error);
    return err("errors.generic");
  }

  await supabase.from("moderation_events").insert({
    listing_id: data.id,
    actor_id: user.id,
    action: "submitted",
  });

  revalidatePath("/[locale]/me/listings", "page");
  return ok({ id: data.id });
}

export async function updateListing(
  id: string,
  input: ListingFormInput,
): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("errors.unauthorized");

  if (!(await checkRateLimit("edit", user.id))) return err("errors.rateLimited");

  const parsed = listingFormSchema.safeParse(input);
  if (!parsed.success) return err("errors.validation");

  const { data: current, error: fetchError } = await supabase
    .from("listings")
    .select("id, status")
    .eq("id", id)
    .single();
  if (fetchError || !current) return err("errors.notFound");

  // Resubmission: rejected/draft/expired goes back to pending; an approved
  // listing is flipped to pending by the DB trigger on content change.
  const backToPending = ["rejected", "draft", "expired"].includes(current.status);

  // owner_id is immutable (also enforced by trigger); don't send it on update
  const { owner_id, ...row } = listingRow(parsed.data, user.id);
  void owner_id;
  const { error } = await supabase
    .from("listings")
    .update(backToPending ? { ...row, status: "pending" as const } : row)
    .eq("id", id);

  if (error) {
    console.error("updateListing failed:", error);
    return err(
      error.message.includes("invalid_status_transition")
        ? "errors.unauthorized"
        : "errors.generic",
    );
  }

  revalidatePath("/[locale]/me/listings", "page");
  revalidatePath("/[locale]", "page");
  return ok({ id });
}

export type OwnerStatusAction = "deactivate" | "republish" | "delete";

export async function setListingStatus(
  id: string,
  action: OwnerStatusAction,
): Promise<Result<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("errors.unauthorized");

  if (!(await checkRateLimit("edit", user.id))) return err("errors.rateLimited");

  const statusMap = {
    deactivate: "draft",
    republish: "pending",
    delete: "deleted",
  } as const;

  const { error } = await supabase
    .from("listings")
    .update({ status: statusMap[action] })
    .eq("id", id);

  if (error) {
    console.error(`setListingStatus ${action} failed:`, error);
    return err(
      error.message.includes("invalid_status_transition")
        ? "errors.unauthorized"
        : "errors.generic",
    );
  }

  revalidatePath("/[locale]/me/listings", "page");
  revalidatePath("/[locale]", "page");
  return ok(null);
}
