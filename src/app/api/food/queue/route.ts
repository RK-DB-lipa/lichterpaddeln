import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { foodQueue } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

// GET: Get pending food orders for the kitchen
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const queue = await db
      .select()
      .from(foodQueue)
      .where(eq(foodQueue.tenantId, tenantId));

    return NextResponse.json(queue);
  } catch (error) {
    console.error("GET /api/food/queue error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST: Add food items to the kitchen queue (from order)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { items } = body; // Array of { foodName, quantity }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "items erforderlich" }, { status: 400 });
    }

    for (const item of items) {
      const existing = await db
        .select()
        .from(foodQueue)
        .where(and(eq(foodQueue.tenantId, tenantId), eq(foodQueue.foodName, item.foodName)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(foodQueue)
          .set({ quantity: existing[0].quantity + item.quantity })
          .where(eq(foodQueue.id, existing[0].id));
      } else {
        await db.insert(foodQueue).values({
          tenantId,
          foodName: item.foodName,
          quantity: item.quantity,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/food/queue error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
