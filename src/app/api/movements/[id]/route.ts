import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";

type Params = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  status: z.enum(["entregado", "encargado"]),
});

function toDatabaseSaleStatus(status: z.infer<typeof patchSchema>["status"]) {
  return status === "encargado" ? "pendiente" : status;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const authError = requireAdminRequest(request);
  if (authError) return authError;

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("movements")
    .update({ status: toDatabaseSaleStatus(parsed.data.status) })
    .eq("id", id)
    .eq("type", "venta");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const authError = requireAdminRequest(request);
  if (authError) return authError;

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: movement, error: movementError } = await supabase
    .from("movements")
    .select("id,type,product_id,quantity")
    .eq("id", id)
    .single();

  if (movementError) return NextResponse.json({ error: movementError.message }, { status: 500 });

  if (movement?.type === "venta" && movement.product_id && movement.quantity) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("stock,sold")
      .eq("id", movement.product_id)
      .single();

    if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });

    const { error: updateError } = await supabase
      .from("products")
      .update({
        stock: Number(product.stock) + Number(movement.quantity),
        sold: Math.max(0, Number(product.sold) - Number(movement.quantity)),
      })
      .eq("id", movement.product_id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error } = await supabase.from("movements").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
