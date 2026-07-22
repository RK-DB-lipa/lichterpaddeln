import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pourQueue } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;
    const url = new URL(req.url);
    const salesPointId = url.searchParams.get("salesPointId");
    if (!salesPointId) {
      return NextResponse.json({ error: "salesPointId required" }, { status: 400 });
    }

    const queue = await db
      .select()
      .from(pourQueue)
      .where(
        and(eq(pourQueue.tenantId, tenantId), eq(pourQueue.salesPointId, parseInt(salesPointId)))
      );
    return NextResponse.json(queue);
  } catch (error) {
    console.error("GET /api/pour/queue error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;
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
        await db
          .update(pourQueue)
          .set({ pendingCount: existing[0].pendingCount + item.quantity })
          .where(eq(pourQueue.id, existing[0].id));
      } else {
        await db.insert(pourQueue).values({
          tenantId,
          salesPointId: parseInt(salesPointId),
          drinkName: item.drinkName,
          pendingCount: item.quantity,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/pour/queue error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
