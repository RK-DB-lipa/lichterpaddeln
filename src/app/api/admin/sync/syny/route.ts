import { NextResponse } from "next/server";
import { db } from "@/db";
import { drinks, salesPoints, drinkSalesPoints, cupCounters, managedUsers } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

const ADMIN_TENANT = 0;
const LIPA_TENANT = 1;

/**
 * POST /api/admin/sync
 * Synchronisiert alle Daten zwischen admin (tenantId=0) und Lipa (tenantId=1) beidseitig.
 * - Getränke (inkl. Verkaufsstellen-Zuordnung)
 * - Verkaufsstellen
 * - Becher-Zähler (netto: gegeben - zurückgenommen)
 * 
 * Nur für Super-Admin verfügbar.
 */
export async function POST() {
  try {
    const admin = await getAuthAdmin();
    if (!admin) return NextResponse.json({ error: "Nur für Super-Admin" }, { status: 401 });

    // Prüfen ob Lipa existiert
    const lipa = await db.select().from(managedUsers).where(eq(managedUsers.username, "Lipa")).limit(1);
    if (lipa.length === 0) {
      return NextResponse.json({ error: "Lipa-User existiert nicht. Bitte zuerst /api/admin/seed-lipa aufrufen." }, { status: 400 });
    }
    const lipaTenantId = lipa[0].id;

    const stats = { drinks: 0, salesPoints: 0, cups: 0 };

    // === 1. VERKAUFSSTELLEN SYNCHRONISIEREN ===
    // admin → Lipa
    const adminSPs = await db.select().from(salesPoints).where(and(eq(salesPoints.tenantId, ADMIN_TENANT), eq(salesPoints.isActive, true)));
    const lipaSPs = await db.select().from(salesPoints).where(and(eq(salesPoints.tenantId, lipaTenantId), eq(salesPoints.isActive, true)));
    
    const adminSPNames = new Set(adminSPs.map(sp => sp.name));
    const lipaSPNames = new Set(lipaSPs.map(sp => sp.name));
    const lipaSPNameToId = new Map(lipaSPs.map(sp => [sp.name, sp.id]));
    const adminSPNameToId = new Map(adminSPs.map(sp => [sp.name, sp.id]));

    // Neue SPs von admin → Lipa
    for (const sp of adminSPs) {
      if (!lipaSPNames.has(sp.name)) {
        await db.insert(salesPoints).values({
          tenantId: lipaTenantId, name: sp.name, sortOrder: sp.sortOrder, isActive: true,
        });
        stats.salesPoints++;
      }
    }
    // Neue SPs von Lipa → admin
    for (const sp of lipaSPs) {
      if (!adminSPNames.has(sp.name)) {
        await db.insert(salesPoints).values({
          tenantId: ADMIN_TENANT, name: sp.name, sortOrder: sp.sortOrder, isActive: true,
        });
        stats.salesPoints++;
      }
    }

    // SP-ID-Mapping neu laden
    const allAdminSPs = await db.select().from(salesPoints).where(eq(salesPoints.tenantId, ADMIN_TENANT));
    const allLipaSPs = await db.select().from(salesPoints).where(eq(salesPoints.tenantId, lipaTenantId));
    const adminIdToName = new Map(allAdminSPs.map(sp => [sp.id, sp.name]));
    const lipaNameToId = new Map(allLipaSPs.map(sp => [sp.name, sp.id]));
    const lipaIdToName = new Map(allLipaSPs.map(sp => [sp.id, sp.name]));
    const adminNameToId = new Map(allAdminSPs.map(sp => [sp.name, sp.id]));

    // === 2. GETRÄNKE SYNCHRONISIEREN ===
    const adminDrinks = await db.select().from(drinks).where(eq(drinks.tenantId, ADMIN_TENANT));
    const lipaDrinks = await db.select().from(drinks).where(eq(drinks.tenantId, lipaTenantId));
    
    // admin → Lipa
    for (const drink of adminDrinks) {
      const existing = await db.select().from(drinks)
        .where(and(eq(drinks.tenantId, lipaTenantId), eq(drinks.name, drink.name)))
        .limit(1);
      
      if (existing.length === 0) {
        const [newDrink] = await db.insert(drinks).values({
          tenantId: lipaTenantId, name: drink.name, priceGross: drink.priceGross,
          taxRate: drink.taxRate, hasDeposit: drink.hasDeposit, depositAmount: drink.depositAmount,
          cupSize: drink.cupSize, color: drink.color, imageUrl: drink.imageUrl,
          sortOrder: drink.sortOrder, isActive: drink.isActive, isPourDrink: drink.isPourDrink,
          group: drink.group,
        }).returning();
        
        // Verkaufsstellen-Zuordnung kopieren
        const adminAssignments = await db.select().from(drinkSalesPoints).where(eq(drinkSalesPoints.drinkId, drink.id));
        const mappedSPIds = adminAssignments
          .map(a => adminIdToName.get(a.salesPointId))
          .filter((n): n is string => !!n)
          .map(n => lipaNameToId.get(n))
          .filter((id): id is number => !!id);
        
        if (mappedSPIds.length > 0) {
          await db.insert(drinkSalesPoints).values(
            mappedSPIds.map(spId => ({ drinkId: newDrink.id, salesPointId: spId }))
          );
        }
        stats.drinks++;
      } else {
        // Bestehendes Getränk aktualisieren
        await db.update(drinks).set({
          priceGross: drink.priceGross, taxRate: drink.taxRate, hasDeposit: drink.hasDeposit,
          depositAmount: drink.depositAmount, cupSize: drink.cupSize, color: drink.color,
          imageUrl: drink.imageUrl, sortOrder: drink.sortOrder, isActive: drink.isActive,
          isPourDrink: drink.isPourDrink, group: drink.group,
        }).where(eq(drinks.id, existing[0].id));
        
        // Verkaufsstellen-Zuordnung synchronisieren
        await db.delete(drinkSalesPoints).where(eq(drinkSalesPoints.drinkId, existing[0].id));
        const adminAssignments = await db.select().from(drinkSalesPoints).where(eq(drinkSalesPoints.drinkId, drink.id));
        const mappedSPIds = adminAssignments
          .map(a => adminIdToName.get(a.salesPointId))
          .filter((n): n is string => !!n)
          .map(n => lipaNameToId.get(n))
          .filter((id): id is number => !!id);
        
        if (mappedSPIds.length > 0) {
          await db.insert(drinkSalesPoints).values(
            mappedSPIds.map(spId => ({ drinkId: existing[0].id, salesPointId: spId }))
          );
        }
      }
    }

    // Lipa → admin (umgekehrte Richtung)
    for (const drink of lipaDrinks) {
      const existing = await db.select().from(drinks)
        .where(and(eq(drinks.tenantId, ADMIN_TENANT), eq(drinks.name, drink.name)))
        .limit(1);
      
      if (existing.length === 0) {
        const [newDrink] = await db.insert(drinks).values({
          tenantId: ADMIN_TENANT, name: drink.name, priceGross: drink.priceGross,
          taxRate: drink.taxRate, hasDeposit: drink.hasDeposit, depositAmount: drink.depositAmount,
          cupSize: drink.cupSize, color: drink.color, imageUrl: drink.imageUrl,
          sortOrder: drink.sortOrder, isActive: drink.isActive, isPourDrink: drink.isPourDrink,
          group: drink.group,
        }).returning();
        
        const lipaAssignments = await db.select().from(drinkSalesPoints).where(eq(drinkSalesPoints.drinkId, drink.id));
        const mappedSPIds = lipaAssignments
          .map(a => lipaIdToName.get(a.salesPointId))
          .filter((n): n is string => !!n)
          .map(n => adminNameToId.get(n))
          .filter((id): id is number => !!id);
        
        if (mappedSPIds.length > 0) {
          await db.insert(drinkSalesPoints).values(
            mappedSPIds.map(spId => ({ drinkId: newDrink.id, salesPointId: spId }))
          );
        }
        stats.drinks++;
      } else {
        await db.update(drinks).set({
          priceGross: drink.priceGross, taxRate: drink.taxRate, hasDeposit: drink.hasDeposit,
          depositAmount: drink.depositAmount, cupSize: drink.cupSize, color: drink.color,
          imageUrl: drink.imageUrl, sortOrder: drink.sortOrder, isActive: drink.isActive,
          isPourDrink: drink.isPourDrink, group: drink.group,
        }).where(eq(drinks.id, existing[0].id));
        
        await db.delete(drinkSalesPoints).where(eq(drinkSalesPoints.drinkId, existing[0].id));
        const lipaAssignments = await db.select().from(drinkSalesPoints).where(eq(drinkSalesPoints.drinkId, drink.id));
        const mappedSPIds = lipaAssignments
          .map(a => lipaIdToName.get(a.salesPointId))
          .filter((n): n is string => !!n)
          .map(n => adminNameToId.get(n))
          .filter((id): id is number => !!id);
        
        if (mappedSPIds.length > 0) {
          await db.insert(drinkSalesPoints).values(
            mappedSPIds.map(spId => ({ drinkId: existing[0].id, salesPointId: spId }))
          );
        }
      }
    }

    // === 3. BECHER-ZÄHLER SYNCHRONISIEREN ===
    // Netto-Wert (gegeben) wird zwischen beiden Tenants synchronisiert
    const adminCups = await db.select().from(cupCounters).where(eq(cupCounters.tenantId, ADMIN_TENANT));
    const lipaCups = await db.select().from(cupCounters).where(eq(cupCounters.tenantId, lipaTenantId));
    
    // admin → Lipa
    for (const cup of adminCups) {
      const spName = adminIdToName.get(cup.salesPointId);
      if (!spName) continue;
      const lipaSPId = lipaNameToId.get(spName);
      if (!lipaSPId) continue;
      
      await db.execute(sql`
        INSERT INTO cup_counters (tenant_id, sales_point_id, size, given, created_at)
        VALUES (${lipaTenantId}, ${lipaSPId}, ${cup.size}, ${cup.given}, now())
        ON CONFLICT (tenant_id, sales_point_id, size)
        DO UPDATE SET given = ${cup.given}
      `);
      stats.cups++;
    }
    
    // Lipa → admin
    for (const cup of lipaCups) {
      const spName = lipaIdToName.get(cup.salesPointId);
      if (!spName) continue;
      const adminSPId = adminNameToId.get(spName);
      if (!adminSPId) continue;
      
      await db.execute(sql`
        INSERT INTO cup_counters (tenant_id, sales_point_id, size, given, created_at)
        VALUES (${ADMIN_TENANT}, ${adminSPId}, ${cup.size}, ${cup.given}, now())
        ON CONFLICT (tenant_id, sales_point_id, size)
        DO UPDATE SET given = ${cup.given}
      `);
      stats.cups++;
    }

    return NextResponse.json({
      success: true,
      message: `Sync abgeschlossen: ${stats.drinks} Getränke, ${stats.salesPoints} Verkaufsstellen, ${stats.cups} Becher-Zähler synchronisiert`,
      stats,
    });
  } catch (error) {
    console.error("POST /api/admin/sync error:", error);
    return NextResponse.json({ error: "Interner Serverfehler", details: String(error) }, { status: 500 });
  }
}
