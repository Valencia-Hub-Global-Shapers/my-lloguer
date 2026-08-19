"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n } from "@/i18n/client";
import type { Neighborhood } from "@/lib/types/database.types";
import { PinPickerMap } from "@/features/map/components/pin-picker-map";
import { hasMapboxToken } from "@/features/map/components/explorer-map";
import { nearestNeighborhood } from "@/features/map/geocode";
import { VALENCIA_CENTER } from "@/lib/utils";
import { listingFormSchema, type ListingFormInput, type ListingFormValues } from "../schemas";
import { createListing, updateListing } from "../server/actions";
import { PhotoUploader } from "./photo-uploader";

const nullableNumber = {
  setValueAs: (v: unknown) => (v === "" || v == null ? null : Number(v)),
};

export function ListingForm({
  mode,
  userId,
  listingId,
  neighborhoods,
  defaults,
}: {
  mode: "create" | "edit";
  userId: string;
  listingId?: string;
  neighborhoods: Pick<Neighborhood, "name_ca" | "municipality" | "lat" | "lng">[];
  defaults: ListingFormValues;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  const form = useForm<ListingFormValues, unknown, ListingFormInput>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: defaults,
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const type = watch("type");
  const lat = watch("lat");
  const lng = watch("lng");
  const neighborhood = watch("neighborhood");

  // Initial neighborhood detection for new listings
  useEffect(() => {
    if (mode === "create" && !form.getValues("neighborhood")) {
      const n = nearestNeighborhood(neighborhoods, {
        lat: form.getValues("lat"),
        lng: form.getValues("lng"),
      });
      if (n) {
        setValue("neighborhood", n.name_ca);
        setValue("municipality", n.municipality);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPin = (newLat: number, newLng: number) => {
    setValue("lat", newLat, { shouldValidate: true });
    setValue("lng", newLng, { shouldValidate: true });
    const n = nearestNeighborhood(neighborhoods, { lat: newLat, lng: newLng });
    setValue("neighborhood", n?.name_ca ?? "", { shouldValidate: true });
    setValue("municipality", n?.municipality ?? "");
  };

  const onSubmit = handleSubmit(async (values) => {
    const result =
      mode === "create" ? await createListing(values) : await updateListing(listingId!, values);
    if (!result.ok) {
      toast.error(t(result.error));
      return;
    }
    if (mode === "create") {
      setSuccess(true);
    } else {
      toast.success(t("publish.submitEdit"));
      router.push(`/${locale}/me/listings`);
      router.refresh();
    }
  });

  const fieldError = (key: string | undefined) =>
    key ? <p className="text-destructive text-xs">{t(key)}</p> : null;

  if (success) {
    return (
      <Card className="mx-auto mt-16 w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-3 p-8">
          <CheckCircle2 className="text-primary size-10" />
          <h1 className="text-xl font-bold tracking-tight">{t("publish.successTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("publish.successDescription")}</p>
          <Button onClick={() => router.push(`/${locale}/me/listings`)}>
            {t("publish.goToMyListings")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto grid w-full max-w-2xl gap-6 p-4 pb-16">
      <h1 className="text-2xl font-bold tracking-tight">
        {mode === "create" ? t("publish.title") : t("publish.editTitle")}
      </h1>

      {/* 1. Type + location */}
      <Card>
        <CardHeader>
          <CardTitle>1 · {t("publish.stepLocation")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>{t("publish.type")}</Label>
            <ToggleGroup
              type="single"
              value={type}
              onValueChange={(v) => {
                if (v === "room" || v === "full_flat") setValue("type", v);
              }}
            >
              <ToggleGroupItem value="room">{t("listing.typeRoom")}</ToggleGroupItem>
              <ToggleGroupItem value="full_flat">{t("listing.typeFullFlat")}</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="grid gap-1.5">
            <Label>{t("publish.dropPin")}</Label>
            {hasMapboxToken ? (
              <PinPickerMap lat={lat} lng={lng} onChange={onPin} />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="any"
                  placeholder="lat"
                  {...register("lat", { valueAsNumber: true })}
                />
                <Input
                  type="number"
                  step="any"
                  placeholder="lng"
                  {...register("lng", { valueAsNumber: true })}
                />
              </div>
            )}
            {fieldError(errors.lat?.message || errors.lng?.message)}
            <p className="text-muted-foreground text-sm">
              {neighborhood
                ? `${t("publish.neighborhoodDetected")}: ${neighborhood}`
                : t("publish.noNeighborhood")}
            </p>
            {fieldError(errors.neighborhood?.message)}
            <input type="hidden" {...register("neighborhood")} />
            <input type="hidden" {...register("municipality")} />
            {hasMapboxToken ? (
              <>
                <input type="hidden" {...register("lat", { valueAsNumber: true })} />
                <input type="hidden" {...register("lng", { valueAsNumber: true })} />
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* 2. Details */}
      <Card>
        <CardHeader>
          <CardTitle>2 · {t("publish.stepDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="price">{t("publish.price")}</Label>
              <Input id="price" type="number" min={0} inputMode="numeric" {...register("price")} />
              {fieldError(errors.price?.message)}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="available_from">{t("publish.availableFrom")}</Label>
              <Input id="available_from" type="date" {...register("available_from")} />
              {fieldError(errors.available_from?.message)}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="description">{t("publish.description")}</Label>
            <Textarea
              id="description"
              rows={5}
              placeholder={t("publish.descriptionPlaceholder")}
              {...register("description")}
            />
            {fieldError(errors.description?.message)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {type === "room" ? (
              <>
                <div className="grid gap-1.5">
                  <Label>{t("publish.roomType")}</Label>
                  <Select
                    value={watch("room_type") ?? ""}
                    onValueChange={(v) =>
                      setValue("room_type", v as "single" | "double" | "shared", {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">{t("listing.roomSingle")}</SelectItem>
                      <SelectItem value="double">{t("listing.roomDouble")}</SelectItem>
                      <SelectItem value="shared">{t("listing.roomShared")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldError(errors.room_type?.message)}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="flatmates">{t("publish.flatmates")}</Label>
                  <Input
                    id="flatmates"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    {...register("flatmates", nullableNumber)}
                  />
                </div>
              </>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="bedrooms">{t("publish.bedrooms")}</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  {...register("bedrooms", nullableNumber)}
                />
                {fieldError(errors.bedrooms?.message)}
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="bathrooms">{t("publish.bathrooms")}</Label>
              <Input
                id="bathrooms"
                type="number"
                min={0}
                inputMode="numeric"
                {...register("bathrooms", nullableNumber)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>{t("publish.preferredGender")}</Label>
              <Select
                value={watch("preferred_gender")}
                onValueChange={(v) =>
                  setValue("preferred_gender", v as ListingFormValues["preferred_gender"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t("listing.genderAny")}</SelectItem>
                  <SelectItem value="female">{t("listing.genderFemale")}</SelectItem>
                  <SelectItem value="male">{t("listing.genderMale")}</SelectItem>
                  <SelectItem value="non_binary">{t("listing.genderNonBinary")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("publish.tenantPref")}</Label>
              <Select
                value={watch("tenant_pref")}
                onValueChange={(v) =>
                  setValue("tenant_pref", v as ListingFormValues["tenant_pref"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t("listing.tenantAny")}</SelectItem>
                  <SelectItem value="students">{t("listing.tenantStudents")}</SelectItem>
                  <SelectItem value="workers">{t("listing.tenantWorkers")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="deposit">{t("publish.deposit")}</Label>
              <Input
                id="deposit"
                type="number"
                min={0}
                inputMode="numeric"
                {...register("deposit", nullableNumber)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["bills_included", "publish.billsIncluded"],
                ["pets", "publish.pets"],
                ["smokers", "publish.smokers"],
              ] as const
            ).map(([key, labelKey]) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <Label htmlFor={`form-${key}`} className="text-xs">
                  {t(labelKey)}
                </Label>
                <Switch
                  id={`form-${key}`}
                  checked={Boolean(watch(key))}
                  onCheckedChange={(checked) => setValue(key, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Photos + contact */}
      <Card>
        <CardHeader>
          <CardTitle>3 · {t("publish.stepPhotos")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>{t("publish.photos")}</Label>
            <PhotoUploader
              userId={userId}
              folder={listingId ?? "draft"}
              value={watch("photos") ?? []}
              onChange={(paths) => setValue("photos", paths, { shouldValidate: true })}
            />
            {fieldError(errors.photos?.message as string | undefined)}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="contact_whatsapp">{t("publish.contactWhatsapp")}</Label>
              <Input
                id="contact_whatsapp"
                type="tel"
                placeholder="+34 600 000 000"
                {...register("contact_whatsapp")}
              />
              {fieldError(errors.contact_whatsapp?.message)}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contact_external">{t("publish.contactExternal")}</Label>
              <Input
                id="contact_external"
                type="url"
                placeholder="https://…"
                {...register("contact_external")}
              />
              {fieldError(errors.contact_external?.message)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting
          ? t("common.loading")
          : mode === "create"
            ? t("publish.submit")
            : t("publish.submitEdit")}
      </Button>
    </form>
  );
}

export const createDefaults: ListingFormValues = {
  type: "room",
  lat: VALENCIA_CENTER[1],
  lng: VALENCIA_CENTER[0],
  neighborhood: "",
  municipality: "",
  price: undefined as unknown as number,
  description: "",
  available_from: "",
  bills_included: false,
  deposit: null,
  flatmates: null,
  preferred_gender: "any",
  room_type: "single",
  pets: false,
  smokers: false,
  tenant_pref: "any",
  bathrooms: 1,
  bedrooms: null,
  contact_whatsapp: "",
  contact_external: "",
  photos: [],
};
