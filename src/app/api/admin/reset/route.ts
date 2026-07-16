import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

// POST: Admin only - reset counters (delete all orders)
export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { salesPointId } = body;

    if (salesPointId) {
      // Delete orders for specific sales point
      // First delete order items for those orders
      const ordersToDelete = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.salesPointId, parseInt(salesPointId)));

      const orderIds = ordersToDelete.map((o) => o.id);

      if (orderIds.length > 0) {
        await db
          .delete(orderItems)
          .where(sql`${orderItems.orderId} IN (${sql.join(orderIds, sql`, `)})`);

        await db
          .delete(orders)
          .where(eq(orders.salesPointId, parseInt(salesPointId)));
      }

      return NextResponse.json({
        success: true,
        message: `Zähler für Verkaufsstelle ${salesPointId} zurückgesetzt`,
        deletedOrders: orderIds.length,
      });
    } else {
      // Delete ALL orders
      await db.delete(orderItems);
      await db.delete(orders);

      return NextResponse.json({
        success: true,
        message: "Alle Zähler zurückgesetzt",
      });
    }
  } catch (error) {
    console.error("POST /api/admin/reset error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
