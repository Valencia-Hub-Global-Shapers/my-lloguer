import { createClient } from "@/lib/supabase/server";
import { getOwnListings } from "@/features/listings/server/queries";
import { getLatestRejection } from "@/features/moderation/server/queries";
import { requireUser } from "@/features/auth/server/session";
import { MyListings } from "@/features/listings/components/my-listings";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import type { ModerationEvent } from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

export default async function MyListingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const current = await requireUser(locale, `/${locale}/me/listings`);
  const dict = await getDictionary(locale);

  const supabase = await createClient();
  const listings = await getOwnListings(supabase, current.userId);

  const rejections: Record<string, Pick<ModerationEvent, "comment" | "created_at">> = {};
  await Promise.all(
    listings
      .filter((l) => l.status === "rejected")
      .map(async (l) => {
        const event = await getLatestRejection(supabase, l.id).catch(() => null);
        if (event) rejections[l.id] = event;
      }),
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-4 pb-16">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">{dict.myListings.title}</h1>
      <MyListings listings={listings} rejections={rejections} />
    </main>
  );
}
