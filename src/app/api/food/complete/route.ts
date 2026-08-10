import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { foodQueue, foodStats } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// POST: Mark food as cooked (decrement queue, increment stats)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { foodName } = body;

    if (!foodName) {
      return NextResponse.json({ error: "foodName erforderlich" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(foodQueue)
      .where(and(eq(foodQueue.tenantId, tenantId), eq(foodQueue.foodName, foodName)))
      .limit(1);

    if (existing.length === 0 || existing[0].quantity <= 0) {
      return NextResponse.json({ error: "Nichts in der Queue" }, { status: 400 });
    }

    // Decrement queue
    await db
      .update(foodQueue)
      .set({ quantity: existing[0].quantity - 1 })
      .where(eq(foodQueue.id, existing[0].id));

    // Increment stats
    const stats = await db
      .select()
      .from(foodStats)
      .where(and(eq(foodStats.tenantId, tenantId), eq(foodStats.foodName, foodName)))
      .limit(1);

    if (stats.length > 0) {
      await db
        .update(foodStats)
        .set({ totalCooked: stats[0].totalCooked + 1 })
        .where(eq(foodStats.id, stats[0].id));
    } else {
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
