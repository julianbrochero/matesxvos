import { NextResponse } from "next/server";
import { z } from "zod";
import { today } from "@/lib/utils";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";
import { mapProduct, toProductRow } from "@/lib/supabase/mappers";

const patchSchema = z
  .object({
    name: z.string().min(1).optional(),
    brand: z.string().min(1).optional(),
    cost: z.coerce.number().positive().optional(),
    price: z.coerce.number().positive().optional(),
    stock: z.coerce.number().int().nonnegative().optional(),
    minStock: z.coerce.number().int().nonnegative().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No hay campos para actualizar");

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const payload = toProductRow({
    name: parsed.data.name ?? "",
    brand: parsed.data.brand ?? "",
    cost: parsed.data.cost ?? 1,
    price: parsed.data.price ?? 1,
    stock: parsed.data.stock ?? 0,
    minStock: parsed.data.minStock ?? 0,
  });

  const partialPayload = Object.fromEntries(
    Object.entries(payload).filter(([key]) => {
      if (key === "min_stock") return parsed.data.minStock !== undefined;
      return parsed.data[key as keyof typeof parsed.data] !== undefined;
    }),
  );

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
  });

  return NextResponse.json(mapProduct(data));
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await params;
  const { error } = await getSupabaseAdmin().from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
