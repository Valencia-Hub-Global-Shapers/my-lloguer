import type { Neighborhood } from "@/lib/types/database.types";
import { distanceMeters } from "@/lib/utils";

export const NEIGHBORHOOD_MAX_DISTANCE_M = 2500;

/** Nearest known neighborhood to a point, or null when farther than the threshold. */
export function nearestNeighborhood(
  neighborhoods: Pick<Neighborhood, "name_ca" | "municipality" | "lat" | "lng">[],
  point: { lat: number; lng: number },
  maxDistanceM = NEIGHBORHOOD_MAX_DISTANCE_M,
): { name_ca: string; municipality: string } | null {
  let best: { name_ca: string; municipality: string } | null = null;
  let bestDistance = Infinity;
  for (const n of neighborhoods) {
    const d = distanceMeters(point, { lat: Number(n.lat), lng: Number(n.lng) });
    if (d < bestDistance) {
      bestDistance = d;
      best = { name_ca: n.name_ca, municipality: n.municipality };
    }
  }
  return best && bestDistance <= maxDistanceM ? best : null;
}
