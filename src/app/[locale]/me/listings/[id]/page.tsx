import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { getListingForOwnerOrAdmin } from "@/features/listings/server/queries";
import { getModerationHistory } from "@/features/moderation/server/queries";
import { StatusBadge } from "@/features/listings/components/status-badge";
import { requireUser } from "@/features/auth/server/session";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

export default async function MyListingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireUser(locale, `/${locale}/me/listings/${id}`);
  const dict = await getDictionary(locale);

  const supabase = await createClient();
  const listing = await getListingForOwnerOrAdmin(supabase, id).catch(() => null);
  if (!listing) notFound();

  const history = await getModerationHistory(supabase, id).catch(() => []);
  const latestRejection = history.find((e) => e.action === "rejected");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-4 pb-16">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold tracking-tight">
          {listing.price} € — {listing.neighborhood ?? listing.municipality}
        </h1>
        <StatusBadge status={listing.status} />
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/me/listings/${id}/edit`}>{dict.common.edit}</Link>
          </Button>
          {listing.status === "approved" ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/${locale}/listing/${id}`}>{dict.common.view}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {listing.status === "rejected" && latestRejection?.comment ? (
        <div className="bg-destructive/5 border-destructive/20 mb-4 rounded-lg border p-3 text-sm">
          <p className="text-destructive mb-1 text-xs font-semibold">
            {dict.listing.moderatorComment}
          </p>
          <p>{latestRejection.comment}</p>
          <Button asChild size="sm" className="mt-2">
            <Link href={`/${locale}/me/listings/${id}/edit`}>
              {dict.listing.editAndResubmit}
            </Link>
          </Button>
        </div>
      ) : null}

      <Separator className="my-4" />

      <h2 className="mb-3 font-semibold">{dict.admin.history}</h2>
      {history.length === 0 ? (
        <p className="text-muted-foreground text-sm">—</p>
      ) : (
        <ol className="grid gap-2">
          {history.map((event) => (
            <li key={event.id} className="flex items-baseline gap-3 text-sm">
              <span className="text-muted-foreground shrink-0 text-xs">
                {formatDate(event.created_at, locale)}
              </span>
              <span className="font-medium">
                {
                  dict.moderationAction[
                    event.action as keyof typeof dict.moderationAction
                  ]
                }
              </span>
              {event.comment ? (
                <span className="text-muted-foreground">· {event.comment}</span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
