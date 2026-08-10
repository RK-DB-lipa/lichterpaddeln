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
    const errors: string[] = [];

    // === SCHRITT 1: Alle bestehenden Daten auf Lipa löschen ===
    try {
      console.log(`[Force-Sync] Schritt 1: Lösche alte Daten auf Tenant ${LIPA_TENANT}...`);
      
      await db.delete(drinkSalesPoints).where(
        sql`drink_id IN (SELECT id FROM drinks WHERE tenant_id = ${LIPA_TENANT})`
      );
      await db.delete(drinks).where(eq(drinks.tenantId, LIPA_TENANT));
      await db.delete(salesPoints).where(eq(salesPoints.tenantId, LIPA_TENANT));
      console.log(`[Force-Sync] ✓ Alte Daten gelöscht`);
    } catch (err) {
      errors.push(`Schritt 1 (Löschen): ${err}`);
      console.error(`[Force-Sync] Fehler in Schritt 1:`, err);
    }

    // === SCHRITT 2: Verkaufsstellen von Admin zu Lipa kopieren ===
    const spIdMap = new Map<number, number>();
    let spCount = 0;
    try {
      console.log(`[Force-Sync] Schritt 2: Kopiere Verkaufsstellen...`);
      const adminSPs = await db.select().from(salesPoints).where(eq(salesPoints.tenantId, ADMIN_TENANT));

      for (const sp of adminSPs) {
        const [newSP] = await db.insert(salesPoints).values({
          tenantId: LIPA_TENANT,
          name: sp.name,
          sortOrder: sp.sortOrder,
          isActive: true,
        }).returning();
        spIdMap.set(sp.id, newSP.id);
        spCount++;
      }
      console.log(`[Force-Sync] ✓ ${spCount} Verkaufsstellen kopiert`);
    } catch (err: any) {
      const errorMsg = err?.message || String(err) || 'Unbekannter Fehler';
      errors.push(`Schritt 2 (Verkaufsstellen): ${errorMsg}`);
      console.error(`[Force-Sync] Fehler in Schritt 2:`, err);
    }

    // === SCHRITT 3: Getränke von Admin zu Lipa kopieren ===
    const drinkIdMap = new Map<number, number>();
    let drinkCount = 0;
    let drinkErrors: string[] = [];
    
    console.log(`[Force-Sync] Schritt 3: Kopiere Getränke...`);
    const adminDrinks = await db.select().from(drinks).where(eq(drinks.tenantId, ADMIN_TENANT));
    console.log(`[Force-Sync] ${adminDrinks.length} Getränke gefunden auf Admin-Tenant`);

    for (const drink of adminDrinks) {
      try {
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
        drinkCount++;
      } catch (err: any) {
        const errorMsg = err?.message || String(err) || 'Unbekannter Fehler';
        const errorCode = err?.code || 'Kein Code';
        const errorDetail = err?.detail || 'Kein Detail';
        const errorHint = err?.hint || 'Kein Hint';
        const errorConstraint = err?.constraint || 'Kein Constraint';
        
        const fullError = `Getränk "${drink.name}" (ID: ${drink.id}):\n` +
          `  Fehler: ${errorMsg}\n` +
          `  Code: ${errorCode}\n` +
          `  Detail: ${errorDetail}\n` +
          `  Hint: ${errorHint}\n` +
          `  Constraint: ${errorConstraint}`;
        
        drinkErrors.push(fullError);
        console.error(`[Force-Sync] Fehler beim Kopieren von "${drink.name}":`);
        console.error('  Message:', errorMsg);
        console.error('  Code:', errorCode);
        console.error('  Detail:', errorDetail);
        console.error('  Hint:', errorHint);
        console.error('  Constraint:', errorConstraint);
        console.error('  Full error:', err);
      }
    }
    
    console.log(`[Force-Sync] ✓ ${drinkCount}/${adminDrinks.length} Getränke kopiert`);
    if (drinkErrors.length > 0) {
      console.error(`[Force-Sync] ${drinkErrors.length} Fehler beim Kopieren von Getränken:`);
      drinkErrors.forEach(e => console.error('  -', e));
      errors.push(`Schritt 3: ${drinkErrors.length} Getränke konnten nicht kopiert werden`);
      errors.push(...drinkErrors);
    }

    // === SCHRITT 4: Getränke-Verkaufsstellen-Zuordnungen kopieren ===
    let assignmentCount = 0;
    try {
      console.log(`[Force-Sync] Schritt 4: Kopiere Zuordnungen...`);
      const adminAssignments = await db.select().from(drinkSalesPoints);

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
      console.log(`[Force-Sync] ✓ ${assignmentCount} Zuordnungen kopiert`);
    } catch (err: any) {
      const errorMsg = err?.message || String(err) || 'Unbekannter Fehler';
      errors.push(`Schritt 4 (Zuordnungen): ${errorMsg}`);
      console.error(`[Force-Sync] Fehler in Schritt 4:`, err);
    }

    // === ERGEBNIS ===
    const hasErrors = errors.length > 0;
    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors ? `Force-Sync mit Fehlern abgeschlossen!` : `Force-Sync erfolgreich abgeschlossen!`,
      errors: errors,
      stats: {
        adminTenant: ADMIN_TENANT,
        lipaTenant: LIPA_TENANT,
        salesPoints: spCount,
        drinks: drinkCount,
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
