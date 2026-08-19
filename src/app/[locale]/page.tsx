import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getNeighborhoods, getPublicListings } from "@/features/listings/server/queries";
import { parseFilters } from "@/features/search/params";
import { MapExplorer } from "@/features/map/components/map-explorer";
import { VALENCIA_BOUNDS } from "@/lib/utils";
import type { Bounds } from "@/features/listings/types";
import type { BrowseResponse } from "@/features/listings/types";

const DEFAULT_BOUNDS: Bounds = {
  minLng: VALENCIA_BOUNDS[0],
  minLat: VALENCIA_BOUNDS[1],
  maxLng: VALENCIA_BOUNDS[2],
  maxLat: VALENCIA_BOUNDS[3],
};

const EMPTY: BrowseResponse = { pins: [], cards: [], total: 0 };

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters = parseFilters(raw);
  const supabase = await createClient();

  let neighborhoods: Awaited<ReturnType<typeof getNeighborhoods>> = [];
  let data: BrowseResponse = EMPTY;
  try {
    neighborhoods = await getNeighborhoods(supabase);
    data = await getPublicListings(supabase, DEFAULT_BOUNDS, filters, neighborhoods);
  } catch (e) {
    // Supabase not reachable (e.g. local stack not started): render the shell
    console.error("initial listings fetch failed:", e);
  }

  return (
    <Suspense>
      <MapExplorer
        initialData={data}
        initialBounds={DEFAULT_BOUNDS}
        neighborhoods={neighborhoods}
      />
    </Suspense>
  );
}
