import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { managedUsers, salesPoints, drinks, orders, orderItems, pourQueue, pourStats, cupCounters } from "@/db/schema";
import { getAuthAdmin, getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";

const LICENSE_DAYS: Record<string, number> = {
  "1": 1, "2": 2, "3": 3, "4": 4, "14": 14,
  "30": 30, "180": 180, "365": 365,
};

function now() {
  return new Date().toISOString();
}

// GET: list all licensed users
export async function GET() {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
    const users = await db.select().from(managedUsers).orderBy(managedUsers.username);
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST: create new licensed user
export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { username, password, days } = body;

    if (!username || !password || !days) {
      return NextResponse.json({ error: "username, password und days erforderlich" }, { status: 400 });
    }
    if (username.toLowerCase() === "admin") {
      return NextResponse.json({ error: "Dieser Name ist reserviert" }, { status: 400 });
    }

    const daysNum = LICENSE_DAYS[String(days)];
    if (!daysNum) {
      return NextResponse.json({ error: "Ungültiger Lizenzzeitraum" }, { status: 400 });
    }

    // Check duplicate
    const existing = await db
      .select()
      .from(managedUsers)
      .where(eq(managedUsers.username, username))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Benutzername bereits vergeben" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const expiresAt = new Date(Date.now() + daysNum * 24 * 60 * 60 * 1000);

    const [user] = await db
      .insert(managedUsers)
      .values({ username, passwordHash, expiresAt })
      .returning();

    // Seed default data for the new user's tenant
    const tenantId = user.id;

    const defaultSalesPoints = [
      { name: "Getränkewagen 1", sortOrder: 1 },
      { name: "Getränkewagen 2", sortOrder: 2 },
      { name: "Theke links", sortOrder: 3 },
      { name: "Theke rechts", sortOrder: 4 },
    ];
    await db.insert(salesPoints).values(
      defaultSalesPoints.map((sp) => ({ ...sp, tenantId }))
    );

    const defaultDrinks = [
      { name: "Pils", priceGross: 2.98, taxRate: 19, color: "#F59E0B", cupSize: "04", sortOrder: 1 },
      { name: "Weizen", priceGross: 3.33, taxRate: 19, color: "#EAB308", cupSize: "04", sortOrder: 2 },
      { name: "Cola", priceGross: 2.38, taxRate: 19, color: "#DC2626", cupSize: "02", sortOrder: 3 },
      { name: "Fanta", priceGross: 2.38, taxRate: 19, color: "#F97316", cupSize: "02", sortOrder: 4 },
      { name: "Wasser", priceGross: 1.79, taxRate: 19, color: "#3B82F6", cupSize: "02", sortOrder: 5 },
      { name: "Schorle", priceGross: 2.14, taxRate: 7, color: "#10B981", cupSize: "02", sortOrder: 6 },
      { name: "Kaffee", priceGross: 1.93, taxRate: 7, color: "#78350F", cupSize: "02", sortOrder: 7 },
    ];
    await db.insert(drinks).values(
      defaultDrinks.map((d) => ({
        ...d,
        tenantId,
        hasDeposit: true,
        depositAmount: 2.0,
      }))
    );

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// PATCH: extend license, toggle active, reset password
export async function PATCH(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, action, value } = body;
    if (!userId || !action) {
      return NextResponse.json({ error: "userId und action erforderlich" }, { status: 400 });
    }

    const user = await db
      .select()
      .from(managedUsers)
      .where(eq(managedUsers.id, userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });
    }

    switch (action) {
      case "extend": {
        const days = LICENSE_DAYS[String(value)];
        if (!days) return NextResponse.json({ error: "Ungültiger Zeitraum" }, { status: 400 });
        // expiresAt kann null sein (z.B. Lipa-User permanent) – dann von jetzt rechnen
        const base = user[0].expiresAt
          ? Math.max(new Date(user[0].expiresAt).getTime(), Date.now())
          : Date.now();
        const newExpires = new Date(base + days * 24 * 60 * 60 * 1000);
        await db
          .update(managedUsers)
          .set({ expiresAt: newExpires })
          .where(eq(managedUsers.id, userId));
        return NextResponse.json({ success: true, expiresAt: newExpires.toISOString() });
      }
      case "toggleActive": {
        await db
          .update(managedUsers)
          .set({ isActive: !user[0].isActive })
          .where(eq(managedUsers.id, userId));
        return NextResponse.json({ success: true, isActive: !user[0].isActive });
      }
      case "resetPassword": {
        if (!value) return NextResponse.json({ error: "Neues Passwort erforderlich" }, { status: 400 });
        const pwHash = await bcrypt.hash(value, 10);
        await db
          .update(managedUsers)
          .set({ passwordHash: pwHash })
          .where(eq(managedUsers.id, userId));
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
    }
  } catch (error) {
    console.error("PATCH /api/users error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE: remove user + all tenant data
export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ error: "userId erforderlich" }, { status: 400 });
    }

    const tenantId = userId;

    // Delete all data scoped to this tenant
    await db.delete(cupCounters).where(eq(cupCounters.tenantId, tenantId));
    await db.delete(pourStats).where(eq(pourStats.tenantId, tenantId));
    await db.delete(pourQueue).where(eq(pourQueue.tenantId, tenantId));

    // Order items via orders
    const orderIds = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.tenantId, tenantId));
    for (const o of orderIds) {
      await db.delete(orderItems).where(eq(orderItems.orderId, o.id));
    }
    await db.delete(orders).where(eq(orders.tenantId, tenantId));

    await db.delete(drinks).where(eq(drinks.tenantId, tenantId));
    await db.delete(salesPoints).where(eq(salesPoints.tenantId, tenantId));
    await db.delete(managedUsers).where(eq(managedUsers.id, userId));

    return NextResponse.json({ success: true, message: `Nutzer ${userId} und alle Daten gelöscht` });
  } catch (error) {
    console.error("DELETE /api/users error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
