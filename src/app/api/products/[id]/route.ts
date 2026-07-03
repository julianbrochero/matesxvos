import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { today } from "@/lib/utils";
import { requireAdminRequest } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";
import { mapProduct } from "@/lib/supabase/mappers";

const patchSchema = z
  .object({
    name: z.string().min(1).optional(),
    brand: z.string().min(1).optional(),
    location: z.enum(["Buenos Aires", "Villa Maria"]).optional(),
    imageUrl: z.string().trim().max(200000).nullable().optional(),
    cost: z.coerce.number().positive().optional(),
    price: z.coerce.number().positive().optional(),
    wholesalePrice: z.coerce.number().positive().nullable().optional(),
    stock: z.coerce.number().int().nonnegative().optional(),
    minStock: z.coerce.number().int().nonnegative().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No hay campos para actualizar");

type Params = {
  params: Promise<{ id: string }>;
};

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

  const supabase = getSupabaseAdmin();
  const partialPayload: Record<string, string | number | null> = {};
  if (parsed.data.name !== undefined) partialPayload.name = parsed.data.name;
  if (parsed.data.brand !== undefined) partialPayload.brand = parsed.data.brand;
  if (parsed.data.location !== undefined) partialPayload.location = parsed.data.location;
  if (parsed.data.imageUrl !== undefined) partialPayload.image_url = parsed.data.imageUrl?.trim() || null;
  if (parsed.data.cost !== undefined) partialPayload.cost = parsed.data.cost;
  if (parsed.data.price !== undefined) partialPayload.price = parsed.data.price;
  if (parsed.data.wholesalePrice !== undefined) partialPayload.wholesale_price = parsed.data.wholesalePrice;
  if (parsed.data.stock !== undefined) partialPayload.stock = parsed.data.stock;
  if (parsed.data.minStock !== undefined) partialPayload.min_stock = parsed.data.minStock;

  const { data, error } = await supabase
    .from("products")
    .update(partialPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("movements").insert({
    type: parsed.data.stock !== undefined && Object.keys(parsed.data).length === 1 ? "stock" : "producto",
    title: parsed.data.stock !== undefined && Object.keys(parsed.data).length === 1 ? "Stock ajustado" : "Producto actualizado",
    detail:
      parsed.data.stock !== undefined && Object.keys(parsed.data).length === 1
        ? `Nuevo stock manual: ${parsed.data.stock} unidades`
        : `${data.name} recibió nuevos datos de precio o stock`,
    amount: 0,
    profit: 0,
    date: today(),
    location: data.location,
  });

  return NextResponse.json(mapProduct(data));
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const authError = requireAdminRequest(request);
  if (authError) return authError;

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await params;
  const { error } = await getSupabaseAdmin().from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
