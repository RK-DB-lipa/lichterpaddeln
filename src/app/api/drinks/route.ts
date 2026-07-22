import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drinks, drinkSalesPoints } from "@/db/schema";
import { getSession, getAuthAdmin } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";

// GET: Liefert aktive Getränke + Verkaufsstellen-Zuordnung
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

    // Lade Verkaufsstellen-Zuordnung für alle aktiven Getränke
    const drinkIds = activeDrinks.map((d) => d.id);
    const spAssignments = drinkIds.length > 0
      ? await db.select().from(drinkSalesPoints).where(inArray(drinkSalesPoints.drinkId, drinkIds))
      : [];
    const spByDrink = new Map<number, number[]>();
    for (const a of spAssignments) {
      if (!spByDrink.has(a.drinkId)) spByDrink.set(a.drinkId, []);
      spByDrink.get(a.drinkId)!.push(a.salesPointId);
    }

    let result = activeDrinks.map((d) => ({
      ...d,
      salesPointIds: spByDrink.get(d.id) || [],
    }));

    // Optional: Filtere nach Verkaufsstelle
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

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { name, priceGross, taxRate, hasDeposit, depositAmount, cupSize, color, imageUrl, sortOrder, isPourDrink, salesPointIds } = body;

    if (!name || priceGross === undefined) {
      return NextResponse.json({ error: "Name und Bruttopreis sind erforderlich" }, { status: 400 });
    }

    const [drink] = await db
      .insert(drinks)
      .values({
        tenantId, name,
        priceGross: parseFloat(priceGross),
        taxRate: taxRate !== undefined ? parseFloat(taxRate) : 19,
        hasDeposit: hasDeposit !== undefined ? hasDeposit : true,
        depositAmount: depositAmount !== undefined ? parseFloat(depositAmount) : 2.0,
        cupSize: cupSize || "04", color: color || "#3B82F6",
        imageUrl: imageUrl || null,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
        isPourDrink: isPourDrink !== undefined ? isPourDrink : false,
      })
      .returning();

    // Verkaufsstellen-Zuordnung speichern
    if (salesPointIds && Array.isArray(salesPointIds) && salesPointIds.length > 0) {
      await db.insert(drinkSalesPoints).values(
        salesPointIds.map((spId: number) => ({ drinkId: drink.id, salesPointId: spId }))
      );
    }

    return NextResponse.json({ ...drink, salesPointIds: salesPointIds || [] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/drinks error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
