import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getAuthAdmin, signToken } from "@/lib/auth";
import { managedUsers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const admin = await getAuthAdmin();
    if (!admin) return NextResponse.json({ error: "Nur für Super-Admin" }, { status: 401 });

    const users = await db.select().from(managedUsers).orderBy(managedUsers.username);

    const result = [];
    for (const user of users) {
      const tId = user.id;
      const rows: any = await db.execute(sql`
        SELECT
          (SELECT count(*)::int FROM drinks WHERE tenant_id = ${tId}) as drinks,
          (SELECT count(*)::int FROM orders WHERE tenant_id = ${tId}) as orders,
          (SELECT COALESCE(sum(total_poured), 0)::int FROM pour_stats WHERE tenant_id = ${tId}) as pours
      `);
      const data = rows?.[0] || {};
      result.push({
        userId: user.id,
        username: user.username,
        isActive: user.isActive,
        expiresAt: user.expiresAt,
        drinks: data.drinks || 0,
        orders: data.orders || 0,
        pours: data.pours || 0,
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/superadmin error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) return NextResponse.json({ error: "Nur für Super-Admin" }, { status: 401 });

    const body = await req.json();
    const { tenantId } = body;
    if (!tenantId) return NextResponse.json({ error: "tenantId erforderlich" }, { status: 400 });

    const user = await db.select().from(managedUsers).where(eq(managedUsers.id, tenantId)).limit(1);
    if (user.length === 0) return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });

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
