import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";

const saleSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  seller: z.string().min(1),
  payment: z.string().min(1),
  date: z.string().min(1),
});

export async function POST(request: Request) {
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
  });

  if (error) {
    const status = error.message.toLowerCase().includes("stock insuficiente") ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json(data);
}
