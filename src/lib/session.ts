import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { Role, User } from "@prisma/client";
import { db } from "./db";

export const SESSION_COOKIE = "wateen_session";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function signToken(userId: string) {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

async function userFromToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid !== "string") return null;
    return await db.user.findUnique({ where: { id: payload.uid } });
  } catch {
    return null;
  }
}

/** Resolves the caller from a Bearer token, falling back to the browser session cookie. */
export async function getApiUser(req: Request): Promise<User | null> {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return userFromToken(auth.slice(7).trim());
  return getCurrentUser();
}

export async function createSession(userId: string) {
  const token = await signToken(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  return userFromToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export function homeFor(role: Role) {
  if (role === "SUPPLIER") return "/supplier";
  if (role === "ADMIN") return "/leads";
  return "/dashboard";
}

export async function requireUser(roles?: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}
