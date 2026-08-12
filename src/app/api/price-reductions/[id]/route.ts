import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { priceReductions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// PUT: Preisreduktion aktualisieren
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const { id } = await params;
    const reductionId = parseInt(id);
    const body = await req.json();
    const { startTime, endTime, reductionPercent, isActive } = body;

    const updateData: any = {};
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (reductionPercent !== undefined) {
      if (reductionPercent < 0 || reductionPercent > 100) {
        return NextResponse.json({ error: "reductionPercent muss zwischen 0 und 100 liegen" }, { status: 400 });
      }
      updateData.reductionPercent = reductionPercent;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(priceReductions)
      .set(updateData)
      .where(and(eq(priceReductions.id, reductionId), eq(priceReductions.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Preisreduktion nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/price-reductions/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE: Preisreduktion löschen
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const { id } = await params;
    const reductionId = parseInt(id);

    await db
      .delete(priceReductions)
      .where(and(eq(priceReductions.id, reductionId), eq(priceReductions.tenantId, tenantId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/price-reductions/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
