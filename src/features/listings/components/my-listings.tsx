"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/lib/utils";
import type { Listing, ListingStatus, ModerationEvent } from "@/lib/types/database.types";
import { setListingStatus, type OwnerStatusAction } from "../server/actions";
import { StatusBadge } from "./status-badge";

const GROUP_ORDER: ListingStatus[] = ["pending", "approved", "rejected", "expired", "draft"];

type PendingAction = { id: string; action: OwnerStatusAction } | null;

export function MyListings({
  listings,
  rejections,
}: {
  listings: Listing[];
  /** listing id -> latest rejection event */
  rejections: Record<string, Pick<ModerationEvent, "comment" | "created_at">>;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);

  const run = async (id: string, action: OwnerStatusAction) => {
    setBusy(true);
    const result = await setListingStatus(id, action);
    setBusy(false);
    setPending(null);
    if (!result.ok) {
      toast.error(t(result.error));
      return;
    }
    router.refresh();
  };

  if (listings.length === 0) {
    return (
      <div className="grid place-items-center gap-3 p-16 text-center">
        <p className="text-muted-foreground">{t("myListings.empty")}</p>
        <Button asChild>
          <Link href={`/${locale}/publish`}>
            <Plus />
            {t("myListings.publishFirst")}
          </Link>
        </Button>
      </div>
    );
  }

  const groups = GROUP_ORDER.map((status) => ({
    status,
    items: listings.filter((l) => l.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="grid gap-6">
      {groups.map((group) => (
        <section key={group.status}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <StatusBadge status={group.status} />
            <span className="text-muted-foreground">{group.items.length}</span>
          </h2>
          <div className="grid gap-2">
            {group.items.map((listing) => {
              const rejection = rejections[listing.id];
              return (
                <div key={listing.id} className="rounded-xl border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-primary font-bold">{listing.price} €</span>
                    <span className="text-sm">
                      {listing.neighborhood ?? listing.municipality}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(listing.created_at, locale)}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <Button asChild variant="ghost" size="icon" aria-label={t("common.view")}>
                        <Link href={`/${locale}/listing/${listing.id}`}>
                          <Eye />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon" aria-label={t("common.edit")}>
                        <Link href={`/${locale}/me/listings/${listing.id}/edit`}>
                          <Pencil />
                        </Link>
                      </Button>

                      {listing.status === "approved" ? (
                        <ConfirmButton
                          title={t("listing.deactivateConfirmTitle")}
                          description={t("listing.deactivateConfirmDescription")}
                          confirmLabel={t("listing.deactivate")}
                          busy={busy}
                          cancelLabel={t("common.cancel")}
                          open={pending?.id === listing.id && pending.action === "deactivate"}
                          onOpen={(o) =>
                            setPending(o ? { id: listing.id, action: "deactivate" } : null)
                          }
                          onConfirm={() => run(listing.id, "deactivate")}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label={t("listing.deactivate")}>
                              <Undo2 />
                            </Button>
                          }
                        />
                      ) : null}

                      {["draft", "rejected", "expired"].includes(listing.status) ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("listing.republish")}
                          disabled={busy}
                          onClick={() => run(listing.id, "republish")}
                        >
                          <RotateCcw />
                        </Button>
                      ) : null}

                      <ConfirmButton
                        title={t("listing.deleteConfirmTitle")}
                        description={t("listing.deleteConfirmDescription")}
                        confirmLabel={t("common.delete")}
                        busy={busy}
                        cancelLabel={t("common.cancel")}
                        open={pending?.id === listing.id && pending.action === "delete"}
                        onOpen={(o) =>
                          setPending(o ? { id: listing.id, action: "delete" } : null)
                        }
                        onConfirm={() => run(listing.id, "delete")}
                        destructive
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("common.delete")}
                            className="text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        }
                      />
                    </div>
                  </div>

                  {listing.status === "rejected" && rejection?.comment ? (
                    <div className="bg-destructive/5 border-destructive/20 mt-2 rounded-lg border p-2.5 text-sm">
                      <p className="text-destructive mb-0.5 text-xs font-semibold">
                        {t("listing.moderatorComment")}
                      </p>
                      <p>{rejection.comment}</p>
                      <Button asChild size="sm" className="mt-2">
                        <Link href={`/${locale}/me/listings/${listing.id}/edit`}>
                          {t("listing.editAndResubmit")}
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function ConfirmButton({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  trigger,
  busy,
  open,
  onOpen,
  destructive,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  trigger: React.ReactNode;
  busy: boolean;
  open: boolean;
  onOpen: (open: boolean) => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={busy}
            className={destructive ? "bg-destructive hover:bg-destructive/90" : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
