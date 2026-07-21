import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drinks } from "@/db/schema";
import { getSession, getAuthAdmin } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    const tenantId = session?.tenantId ?? 0;

    const activeDrinks = await db
      .select()
      .from(drinks)
      .where(and(eq(drinks.tenantId, tenantId), eq(drinks.isActive, true)))
      .orderBy(drinks.sortOrder);

    const withGross = activeDrinks.map((d) => ({
      ...d,
      priceGross: +(d.priceNet * (1 + d.taxRate / 100)).toFixed(2),
    }));

    return NextResponse.json(withGross);
  } catch (error) {
    console.error("GET /api/drinks error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
    const session = await getSession();
    const tenantId = session?.tenantId ?? 0;

    const body = await req.json();
    const { name, priceNet, taxRate, hasDeposit, depositAmount, cupSize, color, imageUrl, sortOrder, isPourDrink } = body;

    if (!name || priceNet === undefined) {
      return NextResponse.json({ error: "Name und Preis sind erforderlich" }, { status: 400 });
    }

    const [drink] = await db
      .insert(drinks)
      .values({
        tenantId,
        name,
        priceNet: parseFloat(priceNet),
        taxRate: taxRate !== undefined ? parseFloat(taxRate) : 19,
        hasDeposit: hasDeposit !== undefined ? hasDeposit : true,
        depositAmount: depositAmount !== undefined ? parseFloat(depositAmount) : 2.0,
        cupSize: cupSize || "04",
        color: color || "#3B82F6",
        imageUrl: imageUrl || null,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
        isPourDrink: isPourDrink !== undefined ? isPourDrink : false,
      })
      .returning();

    return NextResponse.json(drink, { status: 201 });
  } catch (error) {
    console.error("POST /api/drinks error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
