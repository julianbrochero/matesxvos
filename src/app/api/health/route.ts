import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    supabaseConfigured: isSupabaseConfigured,
  });
}
