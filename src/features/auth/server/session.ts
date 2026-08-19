import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database.types";

export type CurrentProfile = { userId: string; profile: Profile | null } | null;

/** Current auth user + profile, cached per request. Null when anonymous. */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { userId: user.id, profile };
});

export async function requireUser(locale: string, next?: string) {
  const current = await getCurrentProfile();
  if (!current) {
    redirect(`/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  return current;
}

export async function requireAdmin(locale: string) {
  const current = await getCurrentProfile();
  if (!current) redirect(`/${locale}/login`);
  if (!current.profile?.is_admin) redirect(`/${locale}`);
  return current;
}
