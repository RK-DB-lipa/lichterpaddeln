import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drinks } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const { id } = await params;
    const tenantId = session.tenantId;
    const body = await req.json();

    const existing = await db
      .select()
      .from(drinks)
      .where(and(eq(drinks.id, parseInt(id)), eq(drinks.tenantId, tenantId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Getränk nicht gefunden" }, { status: 404 });
    }

    const [updated] = await db
      .update(drinks)
      .set({
        name: body.name ?? existing[0].name,
        priceNet: body.priceNet !== undefined ? parseFloat(body.priceNet) : existing[0].priceNet,
        taxRate: body.taxRate !== undefined ? parseFloat(body.taxRate) : existing[0].taxRate,
        hasDeposit: body.hasDeposit !== undefined ? body.hasDeposit : existing[0].hasDeposit,
        depositAmount: body.depositAmount !== undefined ? parseFloat(body.depositAmount) : existing[0].depositAmount,
        cupSize: body.cupSize ?? existing[0].cupSize,
        color: body.color ?? existing[0].color,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : existing[0].imageUrl,
        sortOrder: body.sortOrder !== undefined ? parseInt(body.sortOrder) : existing[0].sortOrder,
        isPourDrink: body.isPourDrink !== undefined ? body.isPourDrink : existing[0].isPourDrink,
      })
      .where(eq(drinks.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/drinks/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const { id } = await params;
    const tenantId = session.tenantId;

    await db
      .update(drinks)
      .set({ isActive: false })
      .where(and(eq(drinks.id, parseInt(id)), eq(drinks.tenantId, tenantId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/drinks/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
