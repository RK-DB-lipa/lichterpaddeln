import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { priceReductions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// GET: Alle Preisreduktionen für den aktuellen Tenant
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const reductions = await db
      .select()
      .from(priceReductions)
      .where(eq(priceReductions.tenantId, tenantId))
      .orderBy(priceReductions.itemType, priceReductions.itemId);

    return NextResponse.json(reductions);
  } catch (error) {
    console.error("GET /api/price-reductions error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST: Neue Preisreduktion erstellen
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { itemId, itemType, startTime, endTime, reductionPercent } = body;

    if (!itemId || !itemType || !startTime || !endTime || reductionPercent === undefined) {
      return NextResponse.json({ error: "Alle Felder sind erforderlich" }, { status: 400 });
    }

    if (itemType !== "drink" && itemType !== "food") {
      return NextResponse.json({ error: "itemType muss 'drink' oder 'food' sein" }, { status: 400 });
    }

    if (reductionPercent < 0 || reductionPercent > 100) {
      return NextResponse.json({ error: "reductionPercent muss zwischen 0 und 100 liegen" }, { status: 400 });
    }

    const [reduction] = await db
      .insert(priceReductions)
      .values({
        tenantId,
        itemId,
        itemType,
        startTime,
        endTime,
        reductionPercent,
        isActive: true,
      })
      .returning();

    return NextResponse.json(reduction, { status: 201 });
  } catch (error) {
    console.error("POST /api/price-reductions error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
