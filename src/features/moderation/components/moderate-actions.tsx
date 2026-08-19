"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/client";
import { approveListing, rejectListing } from "../server/actions";

export function ModerateActions({ listingId }: { listingId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comment, setComment] = useState("");

  const approve = async () => {
    setBusy(true);
    const result = await approveListing(listingId);
    setBusy(false);
    if (!result.ok) {
      toast.error(t(result.error));
      return;
    }
    toast.success(t("admin.approve"));
    router.refresh();
  };

  const reject = async () => {
    if (comment.trim().length < 3) {
      toast.error(t("errors.validation"));
      return;
    }
    setBusy(true);
    const result = await rejectListing(listingId, comment.trim());
    setBusy(false);
    if (!result.ok) {
      toast.error(t(result.error));
      return;
    }
    setDialogOpen(false);
    toast.success(t("admin.reject"));
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={approve} disabled={busy}>
        <Check />
        {t("admin.approve")}
      </Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={busy}>
            <X />
            {t("admin.reject")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.rejectTitle")}</DialogTitle>
            <DialogDescription>{t("admin.rejectComment")}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={reject} disabled={busy}>
              {t("admin.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
