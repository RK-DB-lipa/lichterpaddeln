import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { salesPoints } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// GET: Liefert Verkaufsstellen
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const allSPs = await db
      .select()
      .from(salesPoints)
      .where(eq(salesPoints.tenantId, tenantId))
      .orderBy(salesPoints.name);

    return NextResponse.json(allSPs);
  } catch (error) {
    console.error("GET /api/sales-points error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST: Neue Verkaufsstelle anlegen (mit Lipa Sync)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    // 1. Im aktuellen Tenant anlegen
    const [sp] = await db.insert(salesPoints).values({ tenantId, name }).returning();

    // 2. === LIPA / TENANT 0 SYNC ===
    if (tenantId === 0 || session.username === "Lipa") {
      const otherTenantId = tenantId === 0 ? 1 : 0;
      
      // Prüfen, ob es im anderen Tenant bereits eine Verkaufsstelle mit diesem Namen gibt
      const existingOther = await db
        .select()
        .from(salesPoints)
        .where(and(eq(salesPoints.tenantId, otherTenantId), eq(salesPoints.name, name)))
        .limit(1);

      if (existingOther.length === 0) {
        // Wenn nicht, neu anlegen
        await db.insert(salesPoints).values({ tenantId: otherTenantId, name });
      } else {
        // Wenn ja, sicherstellen, dass der Name aktuell ist (falls er sich geändert hat, obwohl wir hier POST machen, ist das ein Sicherheitsnetz)
        await db.update(salesPoints)
          .set({ name })
          .where(eq(salesPoints.id, existingOther[0].id));
      }
    }

    return NextResponse.json(sp, { status: 201 });
  } catch (error) {
    console.error("POST /api/sales-points error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// PUT: Verkaufsstelle aktualisieren (mit Lipa Sync)
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const url = new URL(req.url);
    const spId = url.pathname.split("/").pop();
    if (!spId) return NextResponse.json({ error: "Verkaufsstellen-ID erforderlich" }, { status: 400 });

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    // 1. Im aktuellen Tenant aktualisieren
    const [updatedSP] = await db
      .update(salesPoints)
      .set({ name })
      .where(and(eq(salesPoints.id, parseInt(spId)), eq(salesPoints.tenantId, tenantId)))
      .returning();

    // 2. === LIPA / TENANT 0 SYNC ===
    if (tenantId === 0 || session.username === "Lipa") {
      const otherTenantId = tenantId === 0 ? 1 : 0;
      
      // Wir suchen die Verkaufsstelle im anderen Tenant anhand des NAMENS, 
      // da die IDs zwischen den Tenants unterschiedlich sein können.
      const existingOther = await db
        .select()
        .from(salesPoints)
        .where(eq(salesPoints.tenantId, otherTenantId))
        // Hinweis: Wir nehmen hier an, dass der Name das eindeutige Merkmal für den Sync ist.
        // Falls es mehrere mit demselben Namen gibt, wird die erste aktualisiert.
        .limit(1);

      if (existingOther.length > 0) {
        await db
          .update(salesPoints)
          .set({ name })
          .where(eq(salesPoints.id, existingOther[0].id));
      }
    }

    return NextResponse.json(updatedSP);
  } catch (error) {
    console.error("PUT /api/sales-points error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE: Verkaufsstelle löschen (mit Lipa Sync)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const url = new URL(req.url);
    const spId = url.pathname.split("/").pop();
    if (!spId) return NextResponse.json({ error: "Verkaufsstellen-ID erforderlich" }, { status: 400 });

    // Hole den Namen, bevor wir löschen, um ihn im anderen Tenant zu finden
    const [spToDelete] = await db
      .select()
      .from(salesPoints)
      .where(and(eq(salesPoints.id, parseInt(spId)), eq(salesPoints.tenantId, tenantId)));

    if (!spToDelete) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    // 1. Im aktuellen Tenant löschen
    await db.delete(salesPoints).where(eq(salesPoints.id, parseInt(spId)));

    // 2. === LIPA / TENANT 0 SYNC ===
    if (tenantId === 0 || session.username === "Lipa") {
      const otherTenantId = tenantId === 0 ? 1 : 0;
      
      // Lösche die Verkaufsstelle im anderen Tenant anhand des Namens
      await db
        .delete(salesPoints)
        .where(and(eq(salesPoints.tenantId, otherTenantId), eq(salesPoints.name, spToDelete.name)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/sales-points error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
