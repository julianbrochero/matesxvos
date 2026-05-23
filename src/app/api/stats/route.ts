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
    supabase.from("products").select("*"),
    supabase.from("movements").select("*"),
  ]);

  if (productsResult.error) {
    return NextResponse.json({ error: productsResult.error.message }, { status: 500 });
  }
  if (movementsResult.error) {
    return NextResponse.json({ error: movementsResult.error.message }, { status: 500 });
  }

  const products = productsResult.data.map(mapProduct);
  const movements = movementsResult.data.map(mapMovement);
  const sales = movements.filter((movement) => movement.type === "venta").reduce((sum, movement) => sum + movement.amount, 0);
  const profit = movements.filter((movement) => movement.type === "venta").reduce((sum, movement) => sum + movement.profit, 0);
  const stock = products.reduce((sum, product) => sum + product.stock, 0);
  const lowStock = products.filter((product) => product.stock <= 5);
  const topProduct = [...products].sort((a, b) => b.sold - a.sold)[0] ?? null;

  return NextResponse.json({ sales, profit, stock, lowStock, topProduct });
}
