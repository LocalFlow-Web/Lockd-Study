import { NextResponse } from "next/server";
import { authEnabled, DAILY_UPLOAD_LIMIT } from "./config";
import { currentUserId, supabaseServer } from "./server";

type Supa = Awaited<ReturnType<typeof supabaseServer>>;
export type Signed = { supabase: Supa; userId: string };

// In cloud mode, API routes need a signed-in user. Returns null in local mode.
export async function requireUser(): Promise<Signed | null | NextResponse> {
  if (!authEnabled) {
    // Local mode is for your own computer. A live site without logins would
    // let anyone spend your API credits, so refuse instead.
    if (process.env.VERCEL) {
      console.error("[limits] Supabase settings are missing on this deployment; uploads are turned off.");
      return NextResponse.json(
        { error: "Uploads are turned off: logins aren't set up on this site yet." },
        { status: 503 },
      );
    }
    return null;
  }
  const supabase = await supabaseServer();
  const userId = await currentUserId(supabase);
  if (!userId) return NextResponse.json({ error: "Sign in to upload lectures." }, { status: 401 });
  return { supabase, userId };
}

// When the oldest upload in the last 24 hours ages out, a slot opens.
async function nextFreeSlot(supabase: Supa): Promise<string | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("uploads")
    .select("created_at")
    .neq("status", "failed")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(1);
  const oldest = data?.[0]?.created_at;
  return oldest ? new Date(new Date(oldest).getTime() + 24 * 60 * 60 * 1000).toISOString() : null;
}

// Reserve one upload against the daily limit. Returns the upload id, or a
// 429 response when the user is out of uploads for now.
export async function claimUpload({ supabase }: Signed, fileName: string): Promise<number | NextResponse> {
  const { data, error } = await supabase.rpc("claim_upload", { daily_limit: DAILY_UPLOAD_LIMIT, file_name: fileName });
  if (error) {
    console.error("[limits] claim_upload failed", error);
    return NextResponse.json(
      { error: "Couldn't check your upload limit. Make sure the database is set up, then try again." },
      { status: 500 },
    );
  }
  if (data === null) {
    return NextResponse.json(
      {
        error: `You've used your ${DAILY_UPLOAD_LIMIT} free uploads for today.`,
        resetAt: await nextFreeSlot(supabase),
        limitReached: true,
      },
      { status: 429 },
    );
  }
  return data as number;
}

export async function finishUpload(
  { supabase }: Signed,
  uploadId: number,
  result: { ok: boolean; model?: string; inputTokens?: number; outputTokens?: number },
) {
  const { error } = await supabase.rpc("finish_upload", {
    upload_id: uploadId,
    succeeded: result.ok,
    model: result.model ?? null,
    input_tokens: result.inputTokens ?? null,
    output_tokens: result.outputTokens ?? null,
  });
  if (error) console.error("[limits] finish_upload failed", error);
}

export async function usageFor({ supabase, userId }: Signed) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", userId).maybeSingle(),
    supabase.from("uploads").select("id", { count: "exact", head: true }).neq("status", "failed").gte("created_at", since),
  ]);
  const plan = (profile?.plan as string | undefined) ?? "free";
  const used = count ?? 0;
  const limit = plan === "pro" ? null : DAILY_UPLOAD_LIMIT;
  return {
    plan,
    used,
    limit,
    resetAt: limit !== null && used >= limit ? await nextFreeSlot(supabase) : null,
  };
}
