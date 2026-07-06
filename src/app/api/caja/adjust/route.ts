import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currency, today } from "@/lib/utils";
import { requireAdminRequest } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";

const adjustSchema = z.object({
  location: z.enum(["Buenos Aires", "Villa Maria"]),
  amount: z.coerce.number().refine((value) => value !== 0, "El ajuste no puede ser 0"),
  date: z.string().min(1).optional(),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const authError = requireAdminRequest(request);
  if (authError) return authError;

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const parsed = adjustSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { location, amount, date, note } = parsed.data;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("movements").insert({
    type: "ajuste",
    title: "Ajuste de caja",
    detail: note || (amount >= 0 ? `Se sumaron ${currency(amount)} a la caja` : `Se restaron ${currency(Math.abs(amount))} de la caja`),
    amount,
    profit: 0,
    date: date || today(),
    location,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
