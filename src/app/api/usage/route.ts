import { NextResponse } from "next/server";
import { requireUser, usageFor } from "@/lib/supabase/limits";

export const dynamic = "force-dynamic";

// How many uploads the signed-in user has left today.
export async function GET() {
  const signed = await requireUser();
  if (signed instanceof NextResponse) return signed;
  if (!signed) return NextResponse.json({ plan: "local", used: 0, limit: null, resetAt: null });
  return NextResponse.json(await usageFor(signed));
}
