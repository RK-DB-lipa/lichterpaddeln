import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, drinks } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";
import { eq, sql, desc, and } from "drizzle-orm";

// POST: Public - submit an order (at checkout/reset)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, depositReturned, salesPointId } = body;

    if (!salesPointId) {
      return NextResponse.json(
        { error: "Verkaufsstelle ist erforderlich" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Mindestens ein Getränk erforderlich" },
        { status: 400 }
      );
    }

    // Fetch all drinks for price calculation
    const allDrinks = await db.select().from(drinks);
    const drinkMap = new Map(allDrinks.map((d) => [d.id, d]));

    let totalGross = 0;
    let totalDeposit = 0;
    const orderItemData: (typeof orderItems.$inferInsert)[] = [];

    for (const item of items) {
      const drink = drinkMap.get(item.drinkId);
      if (!drink || !drink.isActive) {
        return NextResponse.json(
          { error: `Getränk mit ID ${item.drinkId} nicht gefunden` },
          { status: 400 }
        );
      }

      const priceGross = +(drink.priceNet * (1 + drink.taxRate / 100)).toFixed(2);
      const depositPerUnit = drink.hasDeposit ? drink.depositAmount : 0;
      const itemTotalGross = +(priceGross * item.quantity).toFixed(2);
      const itemTotalDeposit = +(depositPerUnit * item.quantity).toFixed(2);

      totalGross += itemTotalGross;
      totalDeposit += itemTotalDeposit;

      orderItemData.push({
        orderId: 0,
        drinkId: drink.id,
        drinkName: drink.name,
        quantity: item.quantity,
        unitPriceGross: priceGross,
        unitDeposit: depositPerUnit,
        totalPriceGross: itemTotalGross,
        totalDeposit: itemTotalDeposit,
      });
    }

    const depositReturnAmount = (depositReturned || 0) * 2;
    const netDeposit = totalDeposit - depositReturnAmount;

    // Create order
    const [order] = await db
      .insert(orders)
      .values({
        salesPointId: parseInt(salesPointId),
        totalGross: +totalGross.toFixed(2),
        totalDeposit: +totalDeposit.toFixed(2),
        totalDepositReturned: depositReturnAmount,
        netDeposit: +netDeposit.toFixed(2),
      })
      .returning();

    // Create order items
    const itemsWithOrderId = orderItemData.map((item) => ({
      ...item,
      orderId: order.id,
    }));

    await db.insert(orderItems).values(itemsWithOrderId);

    return NextResponse.json(
      {
        orderId: order.id,
        totalGross: order.totalGross,
        totalDeposit: order.totalDeposit,
        totalDepositReturned: order.totalDepositReturned,
        netDeposit: order.netDeposit,
        items: itemsWithOrderId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

// GET: Admin only - list all orders with summaries
export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const url = new URL(req.url);
    const salesPointId = url.searchParams.get("salesPointId");

    // Build filter condition
    const whereCondition = salesPointId
      ? eq(orders.salesPointId, parseInt(salesPointId))
      : undefined;

    // Get orders
    const allOrders = whereCondition
      ? await db
          .select()
          .from(orders)
          .where(whereCondition)
          .orderBy(desc(orders.createdAt))
      : await db.select().from(orders).orderBy(desc(orders.createdAt));

    // Get summary grouped by drink
    const summaryQuery = db
      .select({
        drinkId: orderItems.drinkId,
        drinkName: orderItems.drinkName,
        totalQuantity: sql<number>`sum(${orderItems.quantity})`,
        totalGross: sql<number>`sum(${orderItems.totalPriceGross})`,
        totalDeposit: sql<number>`sum(${orderItems.totalDeposit})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id));

    const summary = salesPointId
      ? await summaryQuery
          .where(eq(orders.salesPointId, parseInt(salesPointId)))
          .groupBy(orderItems.drinkId, orderItems.drinkName)
          .orderBy(desc(sql`sum(${orderItems.quantity})`))
      : await summaryQuery
          .groupBy(orderItems.drinkId, orderItems.drinkName)
          .orderBy(desc(sql`sum(${orderItems.quantity})`));

    // Totals
    const totalsQuery = db
      .select({
        totalOrders: sql<number>`count(*)`,
        totalRevenue: sql<number>`sum(${orders.totalGross})`,
        totalDepositsCharged: sql<number>`sum(${orders.totalDeposit})`,
        totalDepositsReturned: sql<number>`sum(${orders.totalDepositReturned})`,
        netDeposits: sql<number>`sum(${orders.netDeposit})`,
      })
      .from(orders);

    const orderTotals = salesPointId
      ? await totalsQuery.where(eq(orders.salesPointId, parseInt(salesPointId)))
      : await totalsQuery;

    return NextResponse.json({
      orders: allOrders,
      drinkSummary: summary,
      totals: orderTotals[0],
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
