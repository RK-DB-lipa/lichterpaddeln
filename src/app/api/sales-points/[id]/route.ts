import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { salesPoints } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

// PUT: Admin only - update a sales point
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
    const pointId = parseInt(id);
    const body = await req.json();
    const { name, isActive, sortOrder } = body;

    const updateData: Partial<typeof salesPoints.$inferInsert> = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);

    const [updated] = await db
      .update(salesPoints)
      .set(updateData)
      .where(eq(salesPoints.id, pointId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Verkaufsstelle nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/sales-points/[id] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

// DELETE: Admin only - deactivate a sales point
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
    const pointId = parseInt(id);

    const [updated] = await db
      .update(salesPoints)
      .set({ isActive: false })
      .where(eq(salesPoints.id, pointId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Verkaufsstelle nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/sales-points/[id] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
