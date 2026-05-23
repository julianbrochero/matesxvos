import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";
import { mapMovement, mapProduct } from "@/lib/supabase/mappers";

export async function GET(request: NextRequest) {
  const authError = requireAdminRequest(request);
  if (authError) return authError;

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  const [productsResult, movementsResult] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.from("movements").select("*").order("created_at", { ascending: false }),
  ]);

  if (productsResult.error) {
    return NextResponse.json({ error: productsResult.error.message }, { status: 500 });
  }
  if (movementsResult.error) {
    return NextResponse.json({ error: movementsResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    products: productsResult.data.map(mapProduct),
    movements: movementsResult.data.map(mapMovement),
  });
}
