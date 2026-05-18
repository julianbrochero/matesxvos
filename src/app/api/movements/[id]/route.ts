import { NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await params;
  const { error } = await getSupabaseAdmin().from("movements").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
