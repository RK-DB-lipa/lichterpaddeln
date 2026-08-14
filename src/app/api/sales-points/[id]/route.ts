import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { salesPoints, drinkSalesPoints, orderItems, orders } from "@/db/schema";
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

    // Hole die Verkaufsstelle, um den Namen für den Sync zu kennen
    const [spToDelete] = await db
      .select()
      .from(salesPoints)
      .where(and(eq(salesPoints.id, parseInt(id)), eq(salesPoints.tenantId, tenantId)))
      .limit(1);

    if (!spToDelete) {
      return NextResponse.json({ error: "Verkaufsstelle nicht gefunden" }, { status: 404 });
    }

    // 1. Prüfen, ob es Bestellungen für diese Verkaufsstelle gibt
    const orderCount = await db
      .select()
      .from(orders)
      .where(eq(orders.salesPointId, parseInt(id)));

    if (orderCount.length > 0) {
      return NextResponse.json({ 
        error: `Verkaufsstelle kann nicht gelöscht werden: Es existieren ${orderCount.length} Bestellungen für diese Stelle.` 
      }, { status: 400 });
    }

    // 2. Lösche die Zuordnungen zu Getränken
    await db.delete(drinkSalesPoints).where(eq(drinkSalesPoints.salesPointId, parseInt(id)));

    // 3. Lösche die Verkaufsstelle im aktuellen Tenant
    await db.delete(salesPoints).where(eq(salesPoints.id, parseInt(id)));

    // 4. === LIPA / TENANT 0 SYNC ===
    if (tenantId === 0 || session.username === "Lipa") {
      const otherTenantId = tenantId === 0 ? 1 : 0;
      
      // Finde die Verkaufsstelle im anderen Tenant anhand des Namens
      const [otherSP] = await db
        .select()
        .from(salesPoints)
        .where(and(eq(salesPoints.tenantId, otherTenantId), eq(salesPoints.name, spToDelete.name)))
        .limit(1);

      if (otherSP) {
        // Lösche die Zuordnungen zu Getränken im anderen Tenant
        await db.delete(drinkSalesPoints).where(eq(drinkSalesPoints.salesPointId, otherSP.id));
        
        // Lösche die Verkaufsstelle im anderen Tenant
        await db.delete(salesPoints).where(eq(salesPoints.id, otherSP.id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/sales-points/[id] error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
