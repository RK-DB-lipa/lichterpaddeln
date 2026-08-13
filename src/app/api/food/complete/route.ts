import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { foodQueue, foodStats } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { foodName } = body;

    if (!foodName) {
      return NextResponse.json({ error: "foodName ist erforderlich" }, { status: 400 });
    }

    // Queue reduzieren
    const existing = await db
      .select()
      .from(foodQueue)
      .where(and(eq(foodQueue.tenantId, tenantId), eq(foodQueue.foodName, foodName)))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].quantity <= 1) {
        await db.delete(foodQueue).where(eq(foodQueue.id, existing[0].id));
      } else {
        await db
          .update(foodQueue)
          .set({ quantity: existing[0].quantity - 1 })
          .where(eq(foodQueue.id, existing[0].id));
      }
    }

    // ✅ FIX: Stats erhöhen - foodStats hat Spalte "totalCooked", nicht "quantity"
    const existingStats = await db
      .select()
      .from(foodStats)
      .where(and(eq(foodStats.tenantId, tenantId), eq(foodStats.foodName, foodName)))
      .limit(1);

    if (existingStats.length > 0) {
      // Bestehenden Eintrag updaten
      await db
        .update(foodStats)
        .set({ totalCooked: existingStats[0].totalCooked + 1 })
        .where(eq(foodStats.id, existingStats[0].id));
    } else {
      // Neuen Eintrag erstellen
      await db.insert(foodStats).values({
        tenantId,
        foodName,
        totalCooked: 1,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/food/complete error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
