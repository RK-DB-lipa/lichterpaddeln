import { NextResponse } from "next/server";
import { db } from "@/db";
import { drinks, salesPoints, drinkSalesPoints, managedUsers } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

/**
 * POST /api/admin/force-sync-lipa
 * Kopiert ALLE Daten von admin (tenantId=0) zu Lipa (tenantId=2) - FORCE MODE
 * Löscht zuerst alle bestehenden Daten auf Lipa-Tenant und kopiert dann alles neu.
 */
export async function POST() {
  try {
    const admin = await getAuthAdmin();
    if (!admin) return NextResponse.json({ error: "Nur für Super-Admin" }, { status: 401 });

    // Lipa-User finden
    const lipa = await db.select().from(managedUsers).where(eq(managedUsers.username, "Lipa")).limit(1);
    if (lipa.length === 0) {
      return NextResponse.json({ error: "Lipa-User existiert nicht" }, { status: 404 });
    }
    const LIPA_TENANT = lipa[0].id; // Sollte 2 sein
    const ADMIN_TENANT = 0;

    console.log(`[Force-Sync] Admin=${ADMIN_TENANT}, Lipa=${LIPA_TENANT}`);

    // === SCHRITT 1: Alle bestehenden Daten auf Lipa löschen ===
    console.log(`[Force-Sync] Lösche alte Daten auf Tenant ${LIPA_TENANT}...`);
    
    await db.delete(drinkSalesPoints).where(
      sql`drink_id IN (SELECT id FROM drinks WHERE tenant_id = ${LIPA_TENANT})`
    );
    await db.delete(drinks).where(eq(drinks.tenantId, LIPA_TENANT));
    await db.delete(salesPoints).where(eq(salesPoints.tenantId, LIPA_TENANT));

    // === SCHRITT 2: Verkaufsstellen von Admin zu Lipa kopieren ===
    console.log(`[Force-Sync] Kopiere Verkaufsstellen...`);
    const adminSPs = await db.select().from(salesPoints).where(eq(salesPoints.tenantId, ADMIN_TENANT));
    const spIdMap = new Map<number, number>(); // admin SP-ID → Lipa SP-ID

    for (const sp of adminSPs) {
      const [newSP] = await db.insert(salesPoints).values({
        tenantId: LIPA_TENANT,
        name: sp.name,
        sortOrder: sp.sortOrder,
        isActive: true,
      }).returning();
      spIdMap.set(sp.id, newSP.id);
    }

    console.log(`[Force-Sync] ${adminSPs.length} Verkaufsstellen kopiert`);

    // === SCHRITT 3: Getränke von Admin zu Lipa kopieren ===
    console.log(`[Force-Sync] Kopiere Getränke...`);
    const adminDrinks = await db.select().from(drinks).where(eq(drinks.tenantId, ADMIN_TENANT));
    const drinkIdMap = new Map<number, number>(); // admin Drink-ID → Lipa Drink-ID

    for (const drink of adminDrinks) {
      const [newDrink] = await db.insert(drinks).values({
        tenantId: LIPA_TENANT,
        name: drink.name,
        priceGross: drink.priceGross,
        taxRate: drink.taxRate,
        hasDeposit: drink.hasDeposit,
        depositAmount: drink.depositAmount,
        cupSize: drink.cupSize,
        color: drink.color,
        imageUrl: drink.imageUrl,
        sortOrder: drink.sortOrder,
        isActive: drink.isActive,
        isPourDrink: drink.isPourDrink,
        group: drink.group,
      }).returning();
      drinkIdMap.set(drink.id, newDrink.id);
    }

    console.log(`[Force-Sync] ${adminDrinks.length} Getränke kopiert`);

    // === SCHRITT 4: Getränke-Verkaufsstellen-Zuordnungen kopieren ===
    console.log(`[Force-Sync] Kopiere Zuordnungen...`);
    const adminAssignments = await db.select().from(drinkSalesPoints);
    let assignmentCount = 0;

    for (const assignment of adminAssignments) {
      const newDrinkId = drinkIdMap.get(assignment.drinkId);
      const newSPId = spIdMap.get(assignment.salesPointId);
      
      if (newDrinkId && newSPId) {
        await db.insert(drinkSalesPoints).values({
          drinkId: newDrinkId,
          salesPointId: newSPId,
        });
        assignmentCount++;
      }
    }

    console.log(`[Force-Sync] ${assignmentCount} Zuordnungen kopiert`);

    // === ERGEBNIS ===
    return NextResponse.json({
      success: true,
      message: `Force-Sync abgeschlossen!`,
      stats: {
        adminTenant: ADMIN_TENANT,
        lipaTenant: LIPA_TENANT,
        salesPoints: adminSPs.length,
        drinks: adminDrinks.length,
        assignments: assignmentCount,
      },
    });
  } catch (error) {
    console.error("Force-Sync error:", error);
    return NextResponse.json({ 
      error: "Interner Serverfehler", 
      details: String(error) 
    }, { status: 500 });
  }
}
