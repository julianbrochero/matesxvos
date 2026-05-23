import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: isAuthorizedRequest(request) });
}
