// Next.js Auth Helper - funktioniert nur in Next.js!
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "drinks-cart-secret-key-2024-very-secure"
);

export type SessionPayload = {
  role: "admin" | "user";
  username: string;
  userId?: number;
  tenantId: number;
  displayName?: string;
};

export async function signToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getAuthAdmin() {
  const session = await getSession();
  if (!session) return null;
  // Admin ist der User mit role="admin" oder der ursprüngliche Super-Admin
  if (session.role === "admin" || session.username === "admin") {
    return { adminId: session.userId || 0, username: session.username };
  }
  return null;
}
