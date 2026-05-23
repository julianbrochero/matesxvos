import { NextRequest, NextResponse } from "next/server";
import { createSessionResponse, isAuthConfigured, isPasswordAccepted } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!isAuthConfigured() && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Falta configurar APP_PASSWORD en Vercel" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!isPasswordAccepted(password)) {
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  return createSessionResponse();
}
