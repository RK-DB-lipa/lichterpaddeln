import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drinks } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

// PUT: Admin only - update a drink
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;
    const drinkId = parseInt(id);
    const body = await req.json();
    const { name, priceNet, taxRate, hasDeposit, depositAmount, color, imageUrl, isActive, sortOrder, isPourDrink } =
      body;

    const updateData: Partial<typeof drinks.$inferInsert> = {};
    if (name !== undefined) updateData.name = name;
    if (priceNet !== undefined) updateData.priceNet = parseFloat(priceNet);
    if (taxRate !== undefined) updateData.taxRate = parseFloat(taxRate);
    if (hasDeposit !== undefined) updateData.hasDeposit = hasDeposit;
    if (depositAmount !== undefined) updateData.depositAmount = parseFloat(depositAmount);
    if (color !== undefined) updateData.color = color;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);
    if (isPourDrink !== undefined) updateData.isPourDrink = isPourDrink;

    const [updated] = await db
      .update(drinks)
      .set(updateData)
      .where(eq(drinks.id, drinkId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Getränk nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/drinks/[id] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

// DELETE: Admin only - soft delete (deactivate) a drink
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;
    const drinkId = parseInt(id);

    const [updated] = await db
      .update(drinks)
      .set({ isActive: false })
      .where(eq(drinks.id, drinkId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Getränk nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/drinks/[id] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
