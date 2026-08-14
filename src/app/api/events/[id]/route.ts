import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventDrinks, eventFoods } from "@/db/schema";
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
      .from(events)
      .where(and(eq(events.id, parseInt(id)), eq(events.tenantId, tenantId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
    }

    const body = await req.json();
    
    // ✅ NEU: Rabatt sicher parsen (als Fallback den bestehenden Wert nehmen)
    const newDiscount = body.employeeDiscountPercent !== undefined 
      ? parseFloat(String(body.employeeDiscountPercent)) 
      : existing[0].employeeDiscountPercent;

    const [updated] = await db
      .update(events)
      .set({
        name: body.name ?? existing[0].name,
        startDate: body.startDate ? new Date(body.startDate) : existing[0].startDate,
        endDate: body.endDate ? new Date(body.endDate) : existing[0].endDate,
        isActive: body.isActive !== undefined ? body.isActive : existing[0].isActive,
        employeeDiscountPercent: newDiscount, // ✅ HIER WIRD ES JETZT GESPEICHERT!
      })
      .where(eq(events.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/events/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const { id } = await params;
    const tenantId = session.tenantId;

    // Event und alle Zuordnungen löschen
    await db.delete(eventDrinks).where(eq(eventDrinks.eventId, parseInt(id)));
    await db.delete(eventFoods).where(eq(eventFoods.eventId, parseInt(id)));
    await db.delete(events).where(and(eq(events.id, parseInt(id)), eq(events.tenantId, tenantId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/events/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
