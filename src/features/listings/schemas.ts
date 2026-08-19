import { z } from "zod";

const optionalInt = (max: number) =>
  z.coerce.number().int().min(0).max(max).optional().nullable();

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(z.string().url().nullable());

export const listingFormSchema = z
  .object({
    type: z.enum(["room", "full_flat"]),
    lat: z.number().min(38.9, "validation").max(40.1, "validation"),
    lng: z.number().min(-1.3, "validation").max(0.3, "validation"),
    neighborhood: z.string().min(1, "validation"),
    municipality: z.string().min(1, "validation"),
    price: z.coerce.number().int().min(50, "validation").max(20000, "validation"),
    description: z.string().trim().min(20, "validation").max(2000, "validation"),
    available_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "validation")
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null)),
    bills_included: z.boolean(),
    deposit: optionalInt(100000),
    flatmates: optionalInt(30),
    preferred_gender: z.enum(["any", "female", "male", "non_binary"]),
    room_type: z.enum(["single", "double", "shared"]).optional().nullable(),
    pets: z.boolean(),
    smokers: z.boolean(),
    tenant_pref: z.enum(["any", "students", "workers"]),
    bathrooms: optionalInt(10),
    bedrooms: optionalInt(20),
    contact_whatsapp: z
      .string()
      .trim()
      .max(25)
      .optional()
      .nullable()
      .transform((v) => (v ? v : null))
      .pipe(
        z
          .string()
          .regex(/^\+?[0-9][0-9 ]{6,20}$/, "validation")
          .nullable(),
      ),
    contact_external: optionalUrl,
    photos: z
      .array(z.string().min(1).max(300))
      .min(1, "firstPhotoRequired")
      .max(8, "tooManyPhotos"),
  })
  .superRefine((val, ctx) => {
    if (val.type === "room" && !val.room_type) {
      ctx.addIssue({ code: "custom", path: ["room_type"], message: "validation" });
    }
    if (val.type === "full_flat" && !val.bedrooms) {
      ctx.addIssue({ code: "custom", path: ["bedrooms"], message: "validation" });
    }
    if (!val.contact_whatsapp && !val.contact_external) {
      ctx.addIssue({ code: "custom", path: ["contact_whatsapp"], message: "validation" });
    }
  });

export type ListingFormInput = z.infer<typeof listingFormSchema>;
export type ListingFormValues = z.input<typeof listingFormSchema>;

export const rejectSchema = z.object({
  comment: z.string().trim().min(3, "validation").max(1000, "validation"),
});
export type RejectInput = z.infer<typeof rejectSchema>;
