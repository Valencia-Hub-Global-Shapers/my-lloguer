import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ua = request.headers.get("user-agent") ?? "unknown";

  // Views fail open on rate-limit errors (see lib/rate-limit)
  await checkRateLimit("view", ip);

  const day = new Date().toISOString().slice(0, 10);
  const viewerHash = createHash("sha256").update(`${ip}|${ua}|${day}`).digest("hex");

  const supabase = await createClient();
  const { error } = await supabase.rpc("increment_listing_view", {
    p_listing_id: id,
    p_viewer_hash: viewerHash,
  });

  if (error) {
    console.error("increment_listing_view failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
