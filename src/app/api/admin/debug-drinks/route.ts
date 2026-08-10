import { NextResponse } from "next/server";
import { db } from "@/db";
import { drinks, salesPoints, managedUsers } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

// POST: Debug-Endpoint - Zeigt alle Getränke auf allen Tenants
export async function POST() {
  try {
    const admin = await getAuthAdmin();
    if (!admin) return NextResponse.json({ error: "Nur für Super-Admin" }, { status: 401 });

    // Alle Tenants
    const allUsers = await db.select().from(managedUsers);
    const tenantIds = [0, ...allUsers.map(u => u.id)]; // 0 = admin, + alle User

    const result: Record<number, any[]> = {};

    for (const tenantId of tenantIds) {
      const tenantDrinks = await db.select().from(drinks).where(eq(drinks.tenantId, tenantId));
      result[tenantId] = tenantDrinks.map(d => ({
        id: d.id,
        name: d.name,
        priceGross: d.priceGross,
        tenantId: d.tenantId,
      }));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
