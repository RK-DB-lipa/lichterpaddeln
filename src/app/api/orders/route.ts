import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, drinks, cupCounters, salesPoints } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql, desc, and } from "drizzle-orm";

function bumpCup(tId: number, spId: number, size: string, givenCount: number) {
  return sql`
    INSERT INTO cup_counters (tenant_id, sales_point_id, size, given, returned, created_at)
    VALUES (${tId}, ${spId}, ${size}, ${givenCount}, 0, now())
    ON CONFLICT (tenant_id, sales_point_id, size)
    DO UPDATE SET given = cup_counters.given + ${givenCount}
  `;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;
    const displayName = session.displayName || "";

    const body = await req.json();
    const { items, depositReturned, salesPointId, cashierName } = body;

    if (!salesPointId) {
      return NextResponse.json({ error: "Verkaufsstelle ist erforderlich" }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Mindestens ein Getränk erforderlich" }, { status: 400 });
    }

    const allDrinks = await db
      .select()
      .from(drinks)
      .where(eq(drinks.tenantId, tenantId));
    const drinkMap = new Map(allDrinks.map((d) => [d.id, d]));

    let totalGross = 0;
    let totalDeposit = 0;
    const orderItemData: (typeof orderItems.$inferInsert)[] = [];

    for (const item of items) {
      const drink = drinkMap.get(item.drinkId);
      if (!drink || !drink.isActive) {
        return NextResponse.json({ error: `Getränk mit ID ${item.drinkId} nicht gefunden` }, { status: 400 });
      }
      const priceGross = drink.priceGross;
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

      if (drink.hasDeposit) {
        await db.execute(bumpCup(tenantId, salesPointId, drink.cupSize ?? "04", item.quantity));
      }
    }

    const depositReturnAmount = (depositReturned || 0) * 2;
    const netDeposit = totalDeposit - depositReturnAmount;

    const [order] = await db
      .insert(orders)
      .values({
        tenantId,
        salesPointId: parseInt(salesPointId),
        totalGross: +totalGross.toFixed(2),
        totalDeposit: +totalDeposit.toFixed(2),
        totalDepositReturned: depositReturnAmount,
        netDeposit: +netDeposit.toFixed(2),
        cashierName: cashierName || displayName || "",
      })
      .returning();

    const itemsWithOrderId = orderItemData.map((item) => ({ ...item, orderId: order.id }));
    await db.insert(orderItems).values(itemsWithOrderId);

    return NextResponse.json(
      {
        orderId: order.id,
        totalGross: order.totalGross,
        totalDeposit: order.totalDeposit,
        totalDepositReturned: order.totalDepositReturned,
        netDeposit: order.netDeposit,
        cashierName: order.cashierName,
        items: itemsWithOrderId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const url = new URL(req.url);
    const salesPointId = url.searchParams.get("salesPointId");
    const cashierNameFilter = url.searchParams.get("cashierName");

    // Build filter conditions
    const conditions = [eq(orders.tenantId, tenantId)];
    if (salesPointId) conditions.push(eq(orders.salesPointId, parseInt(salesPointId)));
    if (cashierNameFilter) conditions.push(eq(orders.cashierName, cashierNameFilter));

    const where = and(...conditions);

    const allOrders = await db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt));

    const summaryWhere = and(...conditions);

    const summaryQuery = db
      .select({
        drinkId: orderItems.drinkId,
        drinkName: orderItems.drinkName,
        totalQuantity: sql`sum(${orderItems.quantity})`,
        totalGross: sql`sum(${orderItems.totalPriceGross})`,
        totalDeposit: sql`sum(${orderItems.totalDeposit})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(summaryWhere)
      .groupBy(orderItems.drinkId, orderItems.drinkName)
      .orderBy(desc(sql`sum(${orderItems.quantity})`));

    const drinkSummary = await summaryQuery;

    const totalsQuery = db
      .select({
        totalOrders: sql`count(*)`,
        totalRevenue: sql`sum(${orders.totalGross})`,
        totalDepositsCharged: sql`sum(${orders.totalDeposit})`,
        totalDepositsReturned: sql`sum(${orders.totalDepositReturned})`,
        netDeposits: sql`sum(${orders.netDeposit})`,
      })
      .from(orders)
      .where(where);

    const orderTotals = await totalsQuery;

    return NextResponse.json({
      orders: allOrders,
      drinkSummary,
      totals: orderTotals[0],
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
