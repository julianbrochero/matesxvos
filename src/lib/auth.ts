import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "matesxvos_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function appPassword() {
  return process.env.APP_PASSWORD ?? "";
}

function isLocalDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(value: string) {
  return createHmac("sha256", appPassword()).update(value).digest("hex");
}

function createSessionToken() {
  const issuedAt = String(Date.now());
  return `${issuedAt}.${sign(issuedAt)}`;
}

function isValidSessionToken(token?: string) {
  const password = appPassword();
  if (!password) return isLocalDevelopment();
  if (!token) return false;

  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;

  const issuedAtNumber = Number(issuedAt);
  if (!Number.isFinite(issuedAtNumber)) return false;

  const maxAgeMs = SESSION_MAX_AGE * 1000;
  if (Date.now() - issuedAtNumber > maxAgeMs) return false;

  return safeCompare(signature, sign(issuedAt));
}

export function isAuthConfigured() {
  return Boolean(appPassword());
}

export function isPasswordAccepted(password: string) {
  const expected = appPassword();
  if (!expected) return isLocalDevelopment() && password.trim().length > 0;
  return safeCompare(password, expected);
}

export function isAuthorizedRequest(request: NextRequest) {
  return isValidSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export function requireAdminRequest(request: NextRequest) {
  if (isAuthorizedRequest(request)) return null;
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function createSessionResponse() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export function clearSessionResponse() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
