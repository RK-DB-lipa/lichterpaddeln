import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { foods } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const { id } = await params;
    const tenantId = session.tenantId;

    const existing = await db
      .select()
      .from(foods)
      .where(and(eq(foods.id, parseInt(id)), eq(foods.tenantId, tenantId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Food nicht gefunden" }, { status: 404 });
    }

    const body = await req.json();
    const [updated] = await db
      .update(foods)
      .set({
        name: body.name ?? existing[0].name,
        priceGross: body.priceGross !== undefined ? parseFloat(body.priceGross) : existing[0].priceGross,
        taxRate: body.taxRate !== undefined ? parseFloat(body.taxRate) : existing[0].taxRate,
        color: body.color ?? existing[0].color,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : existing[0].imageUrl,
        isCookItem: body.isCookItem !== undefined ? body.isCookItem : existing[0].isCookItem,
        group: body.group !== undefined ? body.group || null : existing[0].group,
      })
      .where(eq(foods.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/foods/[id] error:", error);
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
      .update(foods)
      .set({ isActive: false })
      .where(and(eq(foods.id, parseInt(id)), eq(foods.tenantId, tenantId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/foods/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
