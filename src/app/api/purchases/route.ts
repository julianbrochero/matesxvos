import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";

const purchaseSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().positive(),
  unitPrice: z.coerce.number().positive(),
  date: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const authError = requireAdminRequest(request);
  if (authError) return authError;

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const parsed = purchaseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("register_purchase", {
    p_product_id: parsed.data.productId,
    p_quantity: parsed.data.quantity,
    p_unit_cost: parsed.data.unitCost,
    p_date: parsed.data.date,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: priceError } = await supabase
    .from("products")
    .update({ price: parsed.data.unitPrice })
    .eq("id", parsed.data.productId);

  if (priceError) return NextResponse.json({ error: priceError.message }, { status: 500 });

  return NextResponse.json(data);
}
