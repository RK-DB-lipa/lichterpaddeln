import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getSession, getAuthAdmin } from "@/lib/auth";
import { drinks, salesPoints, orders, orderItems, pourQueue, pourStats, cupCounters, drinkSalesPoints } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET: Liste alle Tenant-IDs (managed_users) + Infos
export async function GET() {
  try {
    const admin = await getAuthAdmin();
    if (!admin) return NextResponse.json({ error: "Nur für Super-Admin" }, { status: 401 });

    // Alle aktiven Nutzer
    const { managedUsers } = await import("@/db/schema");
    const users = await db.select().from(managedUsers).orderBy(managedUsers.username);

    // Für jeden Nutzer: Getränkeanzahl, Bestellanzahl, Zapfanzahl
    const result = [];
    for (const user of users) {
      const tId = user.id;
      const [drinkCount] = await db.select({ count: db.fn.count() }).from(drinks).where(eq(drinks.tenantId, tId));
      const [orderCount] = await db.select({ count: db.fn.count() }).from(orders).where(eq(orders.tenantId, tId));
      const [pourCount] = await db.select({ sum: db.fn.sum(pourStats.totalPoured) }).from(pourStats).where(eq(pourStats.tenantId, tId));
      result.push({
        userId: user.id,
        username: user.username,
        isActive: user.isActive,
        expiresAt: user.expiresAt,
        drinks: drinkCount?.count || 0,
        orders: orderCount?.count || 0,
        pours: pourCount?.sum || 0,
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/superadmin error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST: Wechsel zu einem bestimmten Tenant (gibt JWT für diesen Tenant zurück)
export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) return NextResponse.json({ error: "Nur für Super-Admin" }, { status: 401 });

    const body = await req.json();
    const { tenantId } = body;
    if (!tenantId) return NextResponse.json({ error: "tenantId erforderlich" }, { status: 400 });

    const { managedUsers } = await import("@/db/schema");
    const user = await db.select().from(managedUsers).where(eq(managedUsers.id, tenantId)).limit(1);
    if (user.length === 0) return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });

    const { signToken } = await import("@/lib/auth");
    const token = await signToken({
      role: "admin",
      username: `superadmin_${user[0].username}`,
      tenantId,
      displayName: `🔐 Admin: ${user[0].username}`,
    });

    const response = NextResponse.json({ success: true, tenantUsername: user[0].username });
    response.cookies.set("admin_token", token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", maxAge: 60 * 60 * 24, path: "/",
    });
    return response;
  } catch (error) {
    console.error("POST /api/superadmin error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
