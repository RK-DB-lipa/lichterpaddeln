import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { salesPointId } = body;

    if (salesPointId) {
      const ordersToDelete = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.tenantId, tenantId),
            eq(orders.salesPointId, parseInt(salesPointId))
          )
        );

      const orderIds = ordersToDelete.map((o) => o.id);
      if (orderIds.length > 0) {
        await db.delete(orderItems).where(
          sql`${orderItems.orderId} IN (${sql.join(orderIds, sql`, `)})`
        );
        await db
          .delete(orders)
          .where(
            and(
              eq(orders.tenantId, tenantId),
              eq(orders.salesPointId, parseInt(salesPointId))
            )
          );
      }

      return NextResponse.json({ success: true, message: `Zähler für Verkaufsstelle ${salesPointId} zurückgesetzt`, deletedOrders: orderIds.length });
    } else {
      // Delete ALL orders for this tenant
      const allOrderIds = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.tenantId, tenantId));

      if (allOrderIds.length > 0) {
        const ids = allOrderIds.map((o) => o.id);
        await db.delete(orderItems).where(
          sql`${orderItems.orderId} IN (${sql.join(ids, sql`, `)})`
        );
      }
      await db.delete(orders).where(eq(orders.tenantId, tenantId));

      return NextResponse.json({ success: true, message: "Alle Zähler zurückgesetzt" });
    }
  } catch (error) {
    console.error("POST /api/admin/reset error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
