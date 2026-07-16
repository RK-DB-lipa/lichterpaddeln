import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drinks } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

// GET: Public - list active drinks for POS
export async function GET() {
  try {
    const activeDrinks = await db
      .select()
      .from(drinks)
      .where(eq(drinks.isActive, true))
      .orderBy(drinks.sortOrder);

    // Calculate gross price for each drink
    const withGross = activeDrinks.map((d) => ({
      ...d,
      priceGross: +(d.priceNet * (1 + d.taxRate / 100)).toFixed(2),
    }));

    return NextResponse.json(withGross);
  } catch (error) {
    console.error("GET /api/drinks error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

// POST: Admin only - create a new drink
export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { name, priceNet, taxRate, hasDeposit, depositAmount, color, imageUrl, sortOrder } =
      body;

    if (!name || priceNet === undefined) {
      return NextResponse.json(
        { error: "Name und Preis sind erforderlich" },
        { status: 400 }
      );
    }

    const [drink] = await db
      .insert(drinks)
      .values({
        name,
        priceNet: parseFloat(priceNet),
        taxRate: taxRate !== undefined ? parseFloat(taxRate) : 19,
        hasDeposit: hasDeposit !== undefined ? hasDeposit : true,
        depositAmount: depositAmount !== undefined ? parseFloat(depositAmount) : 2.0,
        color: color || "#3B82F6",
        imageUrl: imageUrl || null,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
      })
      .returning();

    return NextResponse.json(drink, { status: 201 });
  } catch (error) {
    console.error("POST /api/drinks error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
