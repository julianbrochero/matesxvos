import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";

const saleLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
  unitCost: z.coerce.number().positive().optional(),
});

const saleSchema = z.object({
  items: z.array(saleLineSchema).min(1),
  seller: z.string().min(1),
  payment: z.string().min(1),
  customer: z.string().trim().optional().transform((value) => value || null),
  date: z.string().min(1),
  status: z.enum(["entregado", "encargado"]).default("entregado"),
  paymentStatus: z.enum(["pagado", "no_pagado"]).default("pagado"),
});

function toDatabaseSaleStatus(status: z.infer<typeof saleSchema>["status"]) {
  return status === "encargado" ? "pendiente" : status;
}

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

  const { data, error } = await getSupabaseAdmin().rpc("register_sale_batch", {
    p_items: parsed.data.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitCost: item.unitCost ?? null,
    })),
    p_seller: parsed.data.seller,
    p_payment: parsed.data.payment,
    p_date: parsed.data.date,
    p_status: toDatabaseSaleStatus(parsed.data.status),
    p_paid: parsed.data.paymentStatus === "pagado",
    p_customer: parsed.data.customer,
  });

  if (error) {
    const status = error.message.toLowerCase().includes("stock insuficiente") ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json(data);
}
