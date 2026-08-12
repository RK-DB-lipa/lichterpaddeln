import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { foods } from "@/db/schema";
import { getSession, getAuthAdmin } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";
import { getReducedPrice } from "@/lib/priceReduction";

// GET: Liefert aktive Foods für den aktuellen Tenant + reduzierte Preise
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const activeFoods = await db
      .select()
      .from(foods)
      .where(and(eq(foods.tenantId, tenantId), eq(foods.isActive, true)))
      .orderBy(foods.sortOrder);

    // Berechne reduzierte Preise für alle Foods
    const result = [];
    for (const f of activeFoods) {
      const { reducedPrice, reductionPercent, isActive } = await getReducedPrice(
        tenantId,
        f.id,
        "food",
        f.priceGross
      );
      
      result.push({
        ...f,
        reducedPrice: reducedPrice,
        reductionPercent: reductionPercent,
        hasReduction: isActive,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/foods error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST: Neues Food anlegen
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { name, priceGross, taxRate, color, imageUrl, isCookItem, group } = body;

    if (!name || priceGross === undefined) {
      return NextResponse.json({ error: "Name und Bruttopreis erforderlich" }, { status: 400 });
    }

    // Max sortOrder ermitteln
    const maxSortResult = await db.execute(sql`SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM foods WHERE tenant_id = ${tenantId}`);
    const nextSort = ((maxSortResult as any)?.[0]?.max_sort || 0) + 1;

    const [food] = await db
      .insert(foods)
      .values({
        tenantId,
        name,
        priceGross: parseFloat(priceGross),
        taxRate: parseFloat(taxRate || "19"),
        color: color || "#10B981",
        imageUrl: imageUrl || null,
        isCookItem: isCookItem ?? false,
        sortOrder: nextSort,
        group: group || null,
      })
      .returning();

    return NextResponse.json(food, { status: 201 });
  } catch (error) {
    console.error("POST /api/foods error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
