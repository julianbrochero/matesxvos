import { NextResponse } from "next/server";
import { z } from "zod";
import { today } from "@/lib/utils";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";
import { mapProduct, toProductRow } from "@/lib/supabase/mappers";

const productSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  cost: z.coerce.number().positive(),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().nonnegative(),
  minStock: z.coerce.number().int().nonnegative(),
});

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(mapProduct));
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .insert(toProductRow(parsed.data))
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("movements").insert({
    type: "producto",
    title: "Producto creado",
    detail: `${parsed.data.name} quedó disponible con ${parsed.data.stock} unidades`,
    amount: 0,
    profit: 0,
    date: today(),
  });

  return NextResponse.json(mapProduct(data), { status: 201 });
}
