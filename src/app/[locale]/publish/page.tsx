import { createClient } from "@/lib/supabase/server";
import { getNeighborhoods } from "@/features/listings/server/queries";
import { requireUser } from "@/features/auth/server/session";
import { ListingForm, createDefaults } from "@/features/listings/components/listing-form";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function PublishPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const current = await requireUser(locale, `/${locale}/publish`);

  const supabase = await createClient();
  const neighborhoods = await getNeighborhoods(supabase).catch(() => []);

  return (
    <ListingForm
      mode="create"
      userId={current.userId}
      neighborhoods={neighborhoods}
      defaults={createDefaults}
    />
  );
}
