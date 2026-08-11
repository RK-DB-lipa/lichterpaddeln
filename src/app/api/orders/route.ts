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

// Helper: Datum und Zeit zu ISO-String kombinieren
function buildDateTime(date: string | null, time: string | null, type: "start" | "end"): Date | null {
  if (!date && !time) return null;
  
  const d = date || (type === "start" ? "1970-01-01" : "9999-12-31");
  const t = time || (type === "start" ? "00:00" : "23:59");
  
  return new Date(`${d}T${t}:00.000Z`);
}

// Helper: Alias-Namen in Hauptnamen auflösen
async function resolveEmployeeName(tenantId: number, aliasName: string): Promise<string> {
  if (!aliasName) return "";
  
  // Prüfen ob der Name ein Alias ist
  const alias = await db
    .select({
      employeeId: employeeAliases.employeeId,
      displayName: employees.displayName,
    })
    .from(employeeAliases)
    .innerJoin(employees, eq(employeeAliases.employeeId, employees.id))
    .where(and(
      eq(employeeAliases.tenantId, tenantId),
      eq(employeeAliases.aliasName, aliasName.trim())
    ))
    .limit(1);
  
  if (alias.length > 0) {
    // Alias gefunden → Hauptnamen zurückgeben
    return alias[0].displayName;
  }
  
  // Kein Alias gefunden → Originalnamen zurückgeben
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

    // Getränke verarbeiten
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

    // Speisen verarbeiten
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

    // Alias-Namen in Hauptnamen auflösen
    const resolvedCashierName = await resolveEmployeeName(
      tenantId,
      cashierName || displayName || ""
    );

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
      
      // Speisen an die Küche senden (food_queue)
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
    
    // Zeitfilter-Parameter
    const fromDate = url.searchParams.get("fromDate"); // Format: YYYY-MM-DD
    const fromTime = url.searchParams.get("fromTime"); // Format: HH:MM
    const toDate = url.searchParams.get("toDate");     // Format: YYYY-MM-DD
    const toTime = url.searchParams.get("toTime");     // Format: HH:MM

    // Build filter conditions
    const conditions = [eq(orders.tenantId, tenantId)];
    if (salesPointId) conditions.push(eq(orders.salesPointId, parseInt(salesPointId)));
    if (cashierNameFilter) conditions.push(eq(orders.cashierName, cashierNameFilter));
    
    // Zeitfilter anwenden
    if (fromDate || fromTime) {
      const fromDateTime = buildDateTime(fromDate, fromTime, "start");
      if (fromDateTime) {
        conditions.push(gte(orders.createdAt, fromDateTime));
      }
    }
    if (toDate || toTime) {
      const toDateTime = buildDateTime(toDate, toTime, "end");
      if (toDateTime) {
        conditions.push(lte(orders.createdAt, toDateTime));
      }
    }

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

    // Food-Summary
    const foodSummaryQuery = db
      .select({
        foodId: orderFoodItems.foodId,
        foodName: orderFoodItems.foodName,
        totalQuantity: sql`sum(${orderFoodItems.quantity})`,
        totalGross: sql`sum(${orderFoodItems.totalPriceGross})`,
      })
      .from(orderFoodItems)
      .innerJoin(orders, eq(orderFoodItems.orderId, orders.id))
      .where(summaryWhere)
      .groupBy(orderFoodItems.foodId, orderFoodItems.foodName)
      .orderBy(desc(sql`sum(${orderFoodItems.quantity})`));

    const foodSummary = await foodSummaryQuery;

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

    // Für jede Order: foodItems laden
    const ordersWithFoods = await Promise.all(
      allOrders.map(async (order) => {
        const foods = await db
          .select()
          .from(orderFoodItems)
          .where(eq(orderFoodItems.orderId, order.id));
        return { ...order, foodItems: foods };
      })
    );

    return NextResponse.json({
      orders: ordersWithFoods,
      drinkSummary,
      foodSummary,
      totals: orderTotals[0],
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
