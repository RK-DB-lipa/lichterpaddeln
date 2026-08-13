import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, orderFoodItems, drinks, foods, cupCounters, salesPoints, foodQueue, employees, employeeAliases } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";

function bumpCup(tId: number, spId: number, size: string, givenCount: number) {
  return sql`
    INSERT INTO cup_counters (tenant_id, sales_point_id, size, given, returned, created_at)
    VALUES (${tId}, ${spId}, ${size}, ${givenCount}, 0, now())
    ON CONFLICT (tenant_id, sales_point_id, size)
    DO UPDATE SET given = cup_counters.given + ${givenCount}
  `;
}

function buildDateTime(date: string | null, time: string | null, type: "start" | "end"): Date | null {
  if (!date && !time) return null;
  const d = date || (type === "start" ? "1970-01-01" : "9999-12-31");
  const t = time || (type === "start" ? "00:00" : "23:59");
  return new Date(`${d}T${t}:00.000Z`);
}

async function resolveEmployeeName(tenantId: number, aliasName: string): Promise<string> {
  if (!aliasName) return "";
  const alias = await db
    .select({ employeeId: employeeAliases.employeeId, displayName: employees.displayName })
    .from(employeeAliases)
    .innerJoin(employees, eq(employeeAliases.employeeId, employees.id))
    .where(and(eq(employeeAliases.tenantId, tenantId), eq(employeeAliases.aliasName, aliasName.trim())))
    .limit(1);
  if (alias.length > 0) return alias[0].displayName;
  return aliasName.trim();
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;
    const displayName = session.displayName || "";

    const body = await req.json();
    const { items, foodItems, depositReturned, salesPointId, cashierName } = body;

    if (!salesPointId) {
      return NextResponse.json({ error: "Verkaufsstelle ist erforderlich" }, { status: 400 });
    }
    if ((!items || items.length === 0) && (!foodItems || foodItems.length === 0)) {
      return NextResponse.json({ error: "Mindestens ein Getränk oder Speise erforderlich" }, { status: 400 });
    }

    let totalGross = 0;
    let totalDeposit = 0;
    const orderItemData: (typeof orderItems.$inferInsert)[] = [];
    const orderFoodItemData: (typeof orderFoodItems.$inferInsert)[] = [];

    if (items && items.length > 0) {
      const allDrinks = await db.select().from(drinks).where(eq(drinks.tenantId, tenantId));
      const drinkMap = new Map(allDrinks.map((d) => [d.id, d]));

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
    }

    if (foodItems && foodItems.length > 0) {
      const allFoods = await db.select().from(foods).where(eq(foods.tenantId, tenantId));
      const foodMap = new Map(allFoods.map((f) => [f.id, f]));

      for (const item of foodItems) {
        const food = foodMap.get(item.foodId);
        if (!food || !food.isActive) {
          return NextResponse.json({ error: `Speise mit ID ${item.foodId} nicht gefunden` }, { status: 400 });
        }
        const priceGross = food.priceGross;
        const itemTotalGross = +(priceGross * item.quantity).toFixed(2);
        totalGross += itemTotalGross;
        orderFoodItemData.push({
          orderId: 0,
          foodId: food.id,
          foodName: food.name,
          quantity: item.quantity,
          unitPriceGross: priceGross,
          totalPriceGross: itemTotalGross,
        });
      }
    }

    const depositReturnAmount = (depositReturned || 0) * 2;
    const netDeposit = totalDeposit - depositReturnAmount;

    const resolvedCashierName = await resolveEmployeeName(tenantId, cashierName || displayName || "");

    const [order] = await db
      .insert(orders)
      .values({
        tenantId,
        salesPointId: parseInt(salesPointId),
        totalGross: +totalGross.toFixed(2),
        totalDeposit: +totalDeposit.toFixed(2),
        totalDepositReturned: depositReturnAmount,
        netDeposit: +netDeposit.toFixed(2),
        cashierName: resolvedCashierName,
      })
      .returning();

    const itemsWithOrderId = orderItemData.map((item) => ({ ...item, orderId: order.id }));
    if (itemsWithOrderId.length > 0) {
      await db.insert(orderItems).values(itemsWithOrderId);
    }

    const foodItemsWithOrderId = orderFoodItemData.map((item) => ({ ...item, orderId: order.id }));
    if (foodItemsWithOrderId.length > 0) {
      await db.insert(orderFoodItems).values(foodItemsWithOrderId);
      
      for (const foodItem of foodItemsWithOrderId) {
        const existing = await db
          .select()
          .from(foodQueue)
          .where(and(eq(foodQueue.tenantId, tenantId), eq(foodQueue.foodName, foodItem.foodName)))
          .limit(1);
        
        if (existing.length > 0) {
          await db
            .update(foodQueue)
            .set({ quantity: existing[0].quantity + foodItem.quantity })
            .where(eq(foodQueue.id, existing[0].id));
        } else {
          await db.insert(foodQueue).values({
            tenantId,
            foodName: foodItem.foodName,
            quantity: foodItem.quantity,
          });
        }
      }
    }

    return NextResponse.json(
      {
        orderId: order.id,
        totalGross: order.totalGross,
        totalDeposit: order.totalDeposit,
        totalDepositReturned: order.totalDepositReturned,
        netDeposit: order.netDeposit,
        cashierName: order.cashierName,
        items: itemsWithOrderId,
        foodItems: foodItemsWithOrderId,
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
    const fromDate = url.searchParams.get("fromDate");
    const fromTime = url.searchParams.get("fromTime");
    const toDate = url.searchParams.get("toDate");
    const toTime = url.searchParams.get("toTime");

    const conditions = [eq(orders.tenantId, tenantId)];
    if (salesPointId) conditions.push(eq(orders.salesPointId, parseInt(salesPointId)));
    if (cashierNameFilter) conditions.push(eq(orders.cashierName, cashierNameFilter));
    
    if (fromDate || fromTime) {
      const fromDateTime = buildDateTime(fromDate, fromTime, "start");
      if (fromDateTime) conditions.push(gte(orders.createdAt, fromDateTime));
    }
    if (toDate || toTime) {
      const toDateTime = buildDateTime(toDate, toTime, "end");
      if (toDateTime) conditions.push(lte(orders.createdAt, toDateTime));
    }

    const where = and(...conditions);

    // Alle Bestellungen mit Verkaufsstellen-Name
    const allOrders = await db
      .select({
        id: orders.id,
        salesPointId: orders.salesPointId,
        totalGross: orders.totalGross,
        totalDeposit: orders.totalDeposit,
        totalDepositReturned: orders.totalDepositReturned,
        netDeposit: orders.netDeposit,
        cashierName: orders.cashierName,
        createdAt: orders.createdAt,
        salesPointName: salesPoints.name,
      })
      .from(orders)
      .leftJoin(salesPoints, eq(orders.salesPointId, salesPoints.id))
      .where(where)
      .orderBy(desc(orders.createdAt));

    // ✅ Getränke-Auswertung MIT Netto-Preisen (über taxRate aus drinks)
    const drinkSummary = await db
      .select({
        drinkId: orderItems.drinkId,
        drinkName: orderItems.drinkName,
        totalQuantity: sql<number>`sum(${orderItems.quantity})`.as("total_quantity"),
        totalGross: sql<number>`sum(${orderItems.totalPriceGross})`.as("total_gross"),
        totalDeposit: sql<number>`sum(${orderItems.totalDeposit})`.as("total_deposit"),
        taxRate: drinks.taxRate,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(drinks, eq(orderItems.drinkId, drinks.id))
      .where(where)
      .groupBy(orderItems.drinkId, orderItems.drinkName, drinks.taxRate)
      .orderBy(desc(sql`sum(${orderItems.quantity})`));

    // ✅ Speisen-Auswertung MIT Netto-Preisen
    const foodSummary = await db
      .select({
        foodId: orderFoodItems.foodId,
        foodName: orderFoodItems.foodName,
        totalQuantity: sql<number>`sum(${orderFoodItems.quantity})`.as("total_quantity"),
        totalGross: sql<number>`sum(${orderFoodItems.totalPriceGross})`.as("total_gross"),
        taxRate: foods.taxRate,
      })
      .from(orderFoodItems)
      .innerJoin(orders, eq(orderFoodItems.orderId, orders.id))
      .leftJoin(foods, eq(orderFoodItems.foodId, foods.id))
      .where(where)
      .groupBy(orderFoodItems.foodId, orderFoodItems.foodName, foods.taxRate)
      .orderBy(desc(sql`sum(${orderFoodItems.quantity})`));

    // Gesamtsummen
    const orderTotals = await db
      .select({
        totalOrders: sql<number>`count(*)`.as("total_orders"),
        totalRevenue: sql<number>`sum(${orders.totalGross})`.as("total_revenue"),
        totalDepositsCharged: sql<number>`sum(${orders.totalDeposit})`.as("total_deposits_charged"),
        totalDepositsReturned: sql<number>`sum(${orders.totalDepositReturned})`.as("total_deposits_returned"),
        netDeposits: sql<number>`sum(${orders.netDeposit})`.as("net_deposits"),
      })
      .from(orders)
      .where(where);

    // ✅ NEU: Stundenweise Auswertung (ganze Stunden)
    const hourlySummary = await db
      .select({
        dayHour: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD HH24:00')`.as("day_hour"),
        orderCount: sql<number>`count(*)`.as("order_count"),
        revenue: sql<number>`sum(${orders.totalGross})`.as("revenue"),
      })
      .from(orders)
      .where(where)
      .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD HH24:00')`)
      .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD HH24:00')`);

    // ✅ NEU: Tageweise Auswertung
    const dailySummary = await db
      .select({
        day: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`.as("day"),
        orderCount: sql<number>`count(*)`.as("order_count"),
        revenue: sql<number>`sum(${orders.totalGross})`.as("revenue"),
      })
      .from(orders)
      .where(where)
      .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`);

    // ✅ NEU: Auswertung nach Mitarbeiter
    const cashierSummary = await db
      .select({
        cashierName: orders.cashierName,
        orderCount: sql<number>`count(*)`.as("order_count"),
        revenue: sql<number>`sum(${orders.totalGross})`.as("revenue"),
      })
      .from(orders)
      .where(where)
      .groupBy(orders.cashierName)
      .orderBy(desc(sql`sum(${orders.totalGross})`));

    // ✅ NEU: Auswertung nach Verkaufsstelle
    const salesPointSummary = await db
      .select({
        salesPointId: orders.salesPointId,
        salesPointName: salesPoints.name,
        orderCount: sql<number>`count(*)`.as("order_count"),
        revenue: sql<number>`sum(${orders.totalGross})`.as("revenue"),
      })
      .from(orders)
      .leftJoin(salesPoints, eq(orders.salesPointId, salesPoints.id))
      .where(where)
      .groupBy(orders.salesPointId, salesPoints.name)
      .orderBy(desc(sql`sum(${orders.totalGross})`));

    // Für jede Order: Details laden (Getränke + Speisen + Verkaufsstelle)
    const ordersWithDetails = await Promise.all(
      allOrders.map(async (order) => {
        const [orderDrinkItems, orderFoodItemsList] = await Promise.all([
          db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
          db.select().from(orderFoodItems).where(eq(orderFoodItems.orderId, order.id)),
        ]);
        return { ...order, items: orderDrinkItems, foodItems: orderFoodItemsList };
      })
    );

    return NextResponse.json({
      orders: ordersWithDetails,
      drinkSummary,
      foodSummary,
      totals: orderTotals[0],
      hourlySummary,
      dailySummary,
      cashierSummary,
      salesPointSummary,
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
