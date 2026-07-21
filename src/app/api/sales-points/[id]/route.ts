import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { salesPoints } from "@/db/schema";
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
      .from(salesPoints)
      .where(and(eq(salesPoints.id, parseInt(id)), eq(salesPoints.tenantId, tenantId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Verkaufsstelle nicht gefunden" }, { status: 404 });
    }

    const [updated] = await db
      .update(salesPoints)
      .set({
        name: body.name ?? existing[0].name,
        sortOrder: body.sortOrder !== undefined ? parseInt(body.sortOrder) : existing[0].sortOrder,
      })
      .where(eq(salesPoints.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/sales-points/[id] error:", error);
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
      .update(salesPoints)
      .set({ isActive: false })
      .where(and(eq(salesPoints.id, parseInt(id)), eq(salesPoints.tenantId, tenantId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/sales-points/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
