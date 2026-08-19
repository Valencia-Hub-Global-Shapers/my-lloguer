import { z } from "zod";

export const moderationDecisionSchema = z.object({
  listingId: z.string().uuid(),
  comment: z.string().trim().max(1000).optional(),
});

export const rejectDecisionSchema = moderationDecisionSchema.extend({
  comment: z.string().trim().min(3, "validation").max(1000, "validation"),
});
