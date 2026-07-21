
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pourQueue, pourStats } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const tenantId = session?.tenantId ?? 0;
    const body = await req.json();
    const { salesPointId, drinkName } = body;
    if (!salesPointId || !drinkName) return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });

    const existing = await db.select().from(pourQueue)
      .where(and(eq(pourQueue.tenantId, tenantId), eq(pourQueue.salesPointId, parseInt(salesPointId)), eq(pourQueue.drinkName, drinkName)))
      .limit(1);
    if (existing.length === 0 || existing[0].pendingCount <= 0) return NextResponse.json({ error: "Nichts zu zapfen" }, { status: 400 });

    await db.update(pourQueue).set({ pendingCount: existing[0].pendingCount - 1 }).where(eq(pourQueue.id, existing[0].id));

    const pourerName = session?.displayName || session?.username || "";

    const stats = await db.select().from(pourStats)
      .where(and(eq(pourStats.tenantId, tenantId), eq(pourStats.drinkName, drinkName), eq(pourStats.salesPointId, parseInt(salesPointId)), eq(pourStats.pourerName, pourerName)))
      .limit(1);
    if (stats.length > 0) {
      await db.update(pourStats).set({ totalPoured: stats[0].totalPoured + 1 }).where(eq(pourStats.id, stats[0].id));
    } else {
      await db.insert(pourStats).values({ tenantId, salesPointId: parseInt(salesPointId), drinkName, pourerName, totalPoured: 1 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/pour/complete error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
