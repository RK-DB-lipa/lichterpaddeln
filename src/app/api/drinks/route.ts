import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drinks, drinkSalesPoints, salesPoints } from "@/db/schema";
import { getSession, getAuthAdmin } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";
import { getReducedPrice } from "@/lib/priceReduction";

// GET: Liefert aktive Getränke + Verkaufsstellen-Zuordnung + reduzierte Preise
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;
    const url = new URL(req.url);
    const salesPointId = url.searchParams.get("salesPointId");

    const activeDrinks = await db
      .select()
      .from(drinks)
      .where(and(eq(drinks.tenantId, tenantId), eq(drinks.isActive, true)))
      .orderBy(drinks.sortOrder);

    const drinkIds = activeDrinks.map((d) => d.id);
    const spAssignments = drinkIds.length > 0
      ? await db.select().from(drinkSalesPoints).where(sql`${drinkSalesPoints.drinkId} = ANY(ARRAY[${sql.join(drinkIds, sql`, `)}]::int[])`)
      : [];
    const spByDrink = new Map<number, number[]>();
    for (const a of spAssignments) {
      if (!spByDrink.has(a.drinkId)) spByDrink.set(a.drinkId, []);
      spByDrink.get(a.drinkId)!.push(a.salesPointId);
    }

    // Berechne reduzierte Preise für alle Drinks
    const result = [];
    for (const d of activeDrinks) {
      const { reducedPrice, reductionPercent, isActive } = await getReducedPrice(
        tenantId,
        d.id,
        "drink",
        d.priceGross
      );
      
      result.push({
        ...d,
        priceGross: d.priceGross,
        reducedPrice: reducedPrice,
        reductionPercent: reductionPercent,
        hasReduction: isActive,
        salesPointIds: spByDrink.get(d.id) || [],
      });
    }

    if (salesPointId) {
      const spId = parseInt(salesPointId);
      result = result.filter((d) => !d.salesPointIds.length || d.salesPointIds.includes(spId));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/drinks error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST: Neues Getränk anlegen (mit Admin/Lipa Sync)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    if (session.role !== "admin" && session.username !== "Lipa") {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { name, priceGross, taxRate, hasDeposit, depositAmount, cupSize, color, imageUrl, isPourDrink, salesPointIds, group } = body;

    if (!name || priceGross === undefined) {
      return NextResponse.json({ error: "Name und Bruttopreis erforderlich" }, { status: 400 });
    }

    const drinkData = {
      name,
      priceGross: parseFloat(priceGross),
      taxRate: parseFloat(taxRate || "19"),
      hasDeposit: hasDeposit ?? true,
      depositAmount: parseFloat(depositAmount || "2.0"),
      cupSize: cupSize || "04",
      color: color || "#3B82F6",
      imageUrl: imageUrl || null,
      sortOrder: 9999,
      isPourDrink: isPourDrink ?? false,
      group: group || null,
    };

    // Auf aktuellem Tenant anlegen
    const [drink] = await db.insert(drinks).values({ tenantId, ...drinkData }).returning();

    // Verkaufsstellen-Zuordnung auf aktuellem Tenant
    if (salesPointIds?.length > 0) {
      await db.insert(drinkSalesPoints).values(
        salesPointIds.map((spId: number) => ({ drinkId: drink.id, salesPointId: spId }))
      );
    }

    // === ADMIN/LIPA SYNC ===
    if (tenantId === 0 || session.username === "Lipa") {
      const otherTenantId = tenantId === 0 ? 1 : 0;
      
      const existingOther = await db.select().from(drinks)
        .where(and(eq(drinks.tenantId, otherTenantId), eq(drinks.name, name)))
        .limit(1);
      
      let otherDrinkId: number;
      
      if (existingOther.length === 0) {
        const [otherDrink] = await db.insert(drinks).values({ tenantId: otherTenantId, ...drinkData }).returning();
        otherDrinkId = otherDrink.id;
      } else {
        otherDrinkId = existingOther[0].id;
        await db.update(drinks).set(drinkData).where(eq(drinks.id, otherDrinkId));
      }
      
      // Verkaufsstellen synchronisieren
      if (salesPointIds) {
        await db.delete(drinkSalesPoints).where(eq(drinkSalesPoints.drinkId, otherDrinkId));
        if (salesPointIds.length > 0) {
          // ID-Mapping: aktuelle SP-Namen → andere Tenant SP-IDs
          const currentSPs = await db.select().from(salesPoints).where(eq(salesPoints.tenantId, tenantId));
          const otherSPs = await db.select().from(salesPoints).where(eq(salesPoints.tenantId, otherTenantId));
          const idToName = new Map(currentSPs.map(sp => [sp.id, sp.name]));
          const nameToId = new Map(otherSPs.map(sp => [sp.name, sp.id]));
          
          const mappedIds = salesPointIds
            .map((id: number) => idToName.get(id))
            .filter((n: string | undefined) => n)
            .map((n: string) => nameToId.get(n))
            .filter((id: number | undefined) => id) as number[];
          
          if (mappedIds.length > 0) {
            await db.insert(drinkSalesPoints).values(
              mappedIds.map((spId: number) => ({ drinkId: otherDrinkId, salesPointId: spId }))
            );
          }
        }
      }
    }

    return NextResponse.json({ ...drink, salesPointIds: salesPointIds || [] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/drinks error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
