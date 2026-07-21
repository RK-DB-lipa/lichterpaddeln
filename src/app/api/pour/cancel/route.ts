import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pourQueue } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

// POST: Cancel pour items – decrement the queue when an order is cancelled
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const tenantId = session?.tenantId ?? 0;
    const body = await req.json();
    const { salesPointId, items } = body;

    if (!salesPointId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    for (const item of items) {
      const existing = await db
        .select()
        .from(pourQueue)
        .where(
          and(
            eq(pourQueue.tenantId, tenantId),
            eq(pourQueue.salesPointId, parseInt(salesPointId)),
            eq(pourQueue.drinkName, item.drinkName)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const newCount = Math.max(0, existing[0].pendingCount - item.quantity);
        await db
          .update(pourQueue)
          .set({ pendingCount: newCount })
          .where(eq(pourQueue.id, existing[0].id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/pour/cancel error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
