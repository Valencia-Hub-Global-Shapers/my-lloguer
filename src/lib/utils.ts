import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    typeof date === "string" ? new Date(date) : date,
  );
}

/** Haversine distance in meters between two [lng, lat] points. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** valencia metro default bounds: [minLng, minLat, maxLng, maxLat] */
export const VALENCIA_BOUNDS: [number, number, number, number] = [
  -0.62, 39.28, -0.18, 39.62,
];

export const VALENCIA_CENTER: [number, number] = [-0.3763, 39.4699];
