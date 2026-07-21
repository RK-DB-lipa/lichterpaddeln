import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "drinks-cart-secret-key-2024-very-secure"
);

export type SessionPayload = {
  role: "admin" | "user";
  username: string;
  userId?: number; // managed user id (nur role=user)
  tenantId: number; // 0 = super admin
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

// Nur Super-Admin (für Nutzerverwaltung & Admin-Routen)
export async function getAuthAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return { adminId: 1, username: session.username };
}

// Tenant des aktuellen Requests (0 = super admin, sonst user.id)
export async function getTenantId(): Promise<number> {
  const session = await getSession();
  return session?.tenantId ?? 0;
}
