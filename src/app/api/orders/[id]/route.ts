import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const { id } = await params;
    const tenantId = session.tenantId;

    const order = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, parseInt(id)), eq(orders.tenantId, tenantId)))
      .limit(1);

    if (order.length === 0) {
      return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order[0].id));

    return NextResponse.json({ order: order[0], items });
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
