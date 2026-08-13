import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { foods } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { getReducedPrice } from "@/lib/priceReduction";

// GET: Liefert aktive Speisen + reduzierte Preise
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;
    const url = new URL(req.url);
    const isCookItemParam = url.searchParams.get("isCookItem");
    const eventId = url.searchParams.get("eventId");

    let query = db.select().from(foods).where(eq(foods.tenantId, tenantId));

    if (isCookItemParam === "true") {
      query = query.where(eq(foods.isCookItem, true));
    }

    const activeFoods = await query.orderBy(foods.sortOrder);

    // ✅ FIX: Sichere Verarbeitung ohne Destructuring von null
    const result = await Promise.all(
      activeFoods.map(async (f) => {
        const reduction = await getReducedPrice(tenantId, f.id, "food", f.priceGross);
        
        return {
          ...f,
          priceGross: f.priceGross,
          reducedPrice: reduction ? reduction.reducedPrice : undefined,
          reductionPercent: reduction ? reduction.reductionPercent : undefined,
          hasReduction: reduction ? reduction.isActive : false,
        };
      })
    );

    // Optional: Filterung nach Event (falls in Zukunft implementiert)
    let finalResult = result;
    if (eventId) {
      // Hier könnte später Event-spezifische Logik hin
    }

    return NextResponse.json(finalResult);
  } catch (error) {
    console.error("GET /api/foods error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST: Neue Speise anlegen (mit Admin/Lipa Sync)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    if (session.role !== "admin" && session.username !== "Lipa") {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { name, priceGross, taxRate, color, imageUrl, isCookItem, group } = body;

    if (!name || priceGross === undefined) {
      return NextResponse.json({ error: "Name und Bruttopreis erforderlich" }, { status: 400 });
    }

    const foodData = {
      name,
      priceGross: parseFloat(priceGross),
      taxRate: parseFloat(taxRate || "19"),
      color: color || "#10B981",
      imageUrl: imageUrl || null,
      isCookItem: isCookItem ?? false,
      sortOrder: 9999,
      group: group || null,
    };

    const [food] = await db.insert(foods).values({ tenantId, ...foodData }).returning();

    // === ADMIN/LIPA SYNC ===
    if (tenantId === 0 || session.username === "Lipa") {
      const otherTenantId = tenantId === 0 ? 1 : 0;
      
      const existingOther = await db.select().from(foods)
        .where(and(eq(foods.tenantId, otherTenantId), eq(foods.name, name)))
        .limit(1);
      
      if (existingOther.length === 0) {
        await db.insert(foods).values({ tenantId: otherTenantId, ...foodData });
      } else {
        await db.update(foods).set(foodData).where(eq(foods.id, existingOther[0].id));
      }
    }

    return NextResponse.json(food, { status: 201 });
  } catch (error) {
    console.error("POST /api/foods error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
