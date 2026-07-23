import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

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
  const session = await verifyToken(token);
  if (!session) return null;

  // Für Lizenznutzer: Prüfe ob noch aktiv & nicht abgelaufen (expiresAt null = permanent)
  if (session.role === "user" && session.userId) {
    const { db } = await import("@/db");
    const { managedUsers } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const user = await db
      .select()
      .from(managedUsers)
      .where(eq(managedUsers.id, session.userId))
      .limit(1);
    if (user.length === 0 || !user[0].isActive) return null;
    // expiresAt null = nie ablaufend (z.B. Lipa-User)
    if (user[0].expiresAt && new Date(user[0].expiresAt).getTime() < Date.now()) {
      return null;
    }
  }

  return session;
}

export async function getAuthAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return { adminId: 1, username: session.username };
}

export async function getTenantId(): Promise<number> {
  const session = await getSession();
  return session?.tenantId ?? 0;
}
