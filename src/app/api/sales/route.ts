import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";

const saleSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
  seller: z.string().min(1),
  payment: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(["pendiente", "entregado", "cancelado"]).default("entregado"),
});

export async function POST(request: NextRequest) {
  const authError = requireAdminRequest(request);
  if (authError) return authError;

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const parsed = saleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin().rpc("register_sale", {
    p_product_id: parsed.data.productId,
    p_quantity: parsed.data.quantity,
    p_seller: parsed.data.seller,
    p_payment: parsed.data.payment,
    p_date: parsed.data.date,
    p_status: parsed.data.status,
    p_unit_price: parsed.data.unitPrice,
  });

  if (error) {
    const status = error.message.toLowerCase().includes("stock insuficiente") ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json(data);
}
