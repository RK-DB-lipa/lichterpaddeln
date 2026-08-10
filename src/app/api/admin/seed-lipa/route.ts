import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { managedUsers, drinks, salesPoints, drinkSalesPoints, cupCounters } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { eq, and, sql } from "drizzle-orm";

const ADMIN_TENANT = 0;

// POST: Erstelle Lipa-User ODER synchronisiere admin ↔ Lipa
export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) return NextResponse.json({ error: "Nur für Super-Admin" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "create"; // "create" oder "sync"

    // Prüfen ob Lipa existiert
    const existing = await db.select().from(managedUsers).where(eq(managedUsers.username, "Lipa")).limit(1);
    
    if (mode === "create" && existing.length === 0) {
      // === MODUS 1: LIPA-USER ANLEGEN ===
      const passwordHash = await bcrypt.hash("Lipa456", 10);
      const [user] = await db.insert(managedUsers).values({
        username: "Lipa",
        passwordHash,
        isActive: true,
        expiresAt: null,
      }).returning();

      // Standard-Daten kopieren (falls vorhanden)
      const adminSPs = await db.select().from(salesPoints).where(eq(salesPoints.tenantId, ADMIN_TENANT));
      const adminDrinks = await db.select().from(drinks).where(eq(drinks.tenantId, ADMIN_TENANT));

      for (const sp of adminSPs) {
        await db.insert(salesPoints).values({
          tenantId: user.id, name: sp.name, sortOrder: sp.sortOrder, isActive: true,
        });
      }

      for (const drink of adminDrinks) {
        await db.insert(drinks).values({
          tenantId: user.id, name: drink.name, priceGross: drink.priceGross,
          taxRate: drink.taxRate, hasDeposit: drink.hasDeposit, depositAmount: drink.depositAmount,
          cupSize: drink.cupSize, color: drink.color, imageUrl: drink.imageUrl,
          sortOrder: drink.sortOrder, isActive: drink.isActive, isPourDrink: drink.isPourDrink,
          group: drink.group,
        });
      }

      return NextResponse.json({
        message: "Lipa-User erfolgreich angelegt",
        userId: user.id,
        credentials: { username: "Lipa", password: "Lipa456" },
        copied: { salesPoints: adminSPs.length, drinks: adminDrinks.length },
      });
    }

    // === MODUS 2: SYNC (admin ↔ Lipa) ===
    if (existing.length === 0) {
      return NextResponse.json({ error: "Lipa-User existiert nicht. Bitte zuerst mode: 'create' ausführen." }, { status: 400 });
    }

    const lipaTenantId = existing[0].id;
    const stats = { drinks: 0, salesPoints: 0, cups: 0 };

    // 1. Verkaufsstellen sync
    const adminSPs = await db.select().from(salesPoints).where(and(eq(salesPoints.tenantId, ADMIN_TENANT), eq(salesPoints.isActive, true)));
    const lipaSPs = await db.select().from(salesPoints).where(and(eq(salesPoints.tenantId, lipaTenantId), eq(salesPoints.isActive, true)));
    
    const adminSPNames = new Set(adminSPs.map(sp => sp.name));
    const lipaSPNames = new Set(lipaSPs.map(sp => sp.name));

    for (const sp of adminSPs) {
      if (!lipaSPNames.has(sp.name)) {
        try {
          await db.insert(salesPoints).values({ tenantId: lipaTenantId, name: sp.name, sortOrder: sp.sortOrder, isActive: true });
          stats.salesPoints++;
        } catch { /* duplicate - skip */ }
      }
    }
    for (const sp of lipaSPs) {
      if (!adminSPNames.has(sp.name)) {
        try {
          await db.insert(salesPoints).values({ tenantId: ADMIN_TENANT, name: sp.name, sortOrder: sp.sortOrder, isActive: true });
          stats.salesPoints++;
        } catch { /* duplicate - skip */ }
      }
    }

    // SP-ID-Mapping neu laden
    const allAdminSPs = await db.select().from(salesPoints).where(eq(salesPoints.tenantId, ADMIN_TENANT));
    const allLipaSPs = await db.select().from(salesPoints).where(eq(salesPoints.tenantId, lipaTenantId));
    const adminIdToName = new Map(allAdminSPs.map(sp => [sp.id, sp.name]));
    const lipaNameToId = new Map(allLipaSPs.map(sp => [sp.name, sp.id]));
    const lipaIdToName = new Map(allLipaSPs.map(sp => [sp.id, sp.name]));
    const adminNameToId = new Map(allAdminSPs.map(sp => [sp.name, sp.id]));

    // 2. Getränke sync
    const adminDrinks = await db.select().from(drinks).where(eq(drinks.tenantId, ADMIN_TENANT));
    const lipaDrinks = await db.select().from(drinks).where(eq(drinks.tenantId, lipaTenantId));

    // admin → Lipa
    for (const drink of adminDrinks) {
      const existingDrink = await db.select().from(drinks)
        .where(and(eq(drinks.tenantId, lipaTenantId), eq(drinks.name, drink.name))).limit(1);
      
      if (existingDrink.length === 0) {
        try {
          const [newDrink] = await db.insert(drinks).values({
            tenantId: lipaTenantId, name: drink.name, priceGross: drink.priceGross,
            taxRate: drink.taxRate, hasDeposit: drink.hasDeposit, depositAmount: drink.depositAmount,
            cupSize: drink.cupSize, color: drink.color, imageUrl: drink.imageUrl,
            sortOrder: drink.sortOrder, isActive: drink.isActive, isPourDrink: drink.isPourDrink, group: drink.group,
          }).returning();
          
          const assignments = await db.select().from(drinkSalesPoints).where(eq(drinkSalesPoints.drinkId, drink.id));
          const mappedSPIds = assignments.map(a => adminIdToName.get(a.salesPointId)).filter((n): n is string => !!n).map(n => lipaNameToId.get(n)).filter((id): id is number => !!id);
          if (mappedSPIds.length > 0) {
            await db.insert(drinkSalesPoints).values(mappedSPIds.map(spId => ({ drinkId: newDrink.id, salesPointId: spId })));
          }
          stats.drinks++;
        } catch (insertErr) {
          // Duplicate key - ignore and continue
          console.log(`Drink '${drink.name}' already exists on tenant ${lipaTenantId}, skipping insert`);
        }
      } else {
        await db.update(drinks).set({
          priceGross: drink.priceGross, taxRate: drink.taxRate, hasDeposit: drink.hasDeposit,
          depositAmount: drink.depositAmount, cupSize: drink.cupSize, color: drink.color,
          imageUrl: drink.imageUrl, sortOrder: drink.sortOrder, isActive: drink.isActive,
          isPourDrink: drink.isPourDrink, group: drink.group,
        }).where(eq(drinks.id, existingDrink[0].id));
      }
    }

    // Lipa → admin
    for (const drink of lipaDrinks) {
      const existingDrink = await db.select().from(drinks)
        .where(and(eq(drinks.tenantId, ADMIN_TENANT), eq(drinks.name, drink.name))).limit(1);
      
      if (existingDrink.length === 0) {
        try {
          const [newDrink] = await db.insert(drinks).values({
            tenantId: ADMIN_TENANT, name: drink.name, priceGross: drink.priceGross,
            taxRate: drink.taxRate, hasDeposit: drink.hasDeposit, depositAmount: drink.depositAmount,
            cupSize: drink.cupSize, color: drink.color, imageUrl: drink.imageUrl,
            sortOrder: drink.sortOrder, isActive: drink.isActive, isPourDrink: drink.isPourDrink, group: drink.group,
          }).returning();
          
          const assignments = await db.select().from(drinkSalesPoints).where(eq(drinkSalesPoints.drinkId, drink.id));
          const mappedSPIds = assignments.map(a => lipaIdToName.get(a.salesPointId)).filter((n): n is string => !!n).map(n => adminNameToId.get(n)).filter((id): id is number => !!id);
          if (mappedSPIds.length > 0) {
            await db.insert(drinkSalesPoints).values(mappedSPIds.map(spId => ({ drinkId: newDrink.id, salesPointId: spId })));
          }
          stats.drinks++;
        } catch (insertErr) {
          console.log(`Drink '${drink.name}' already exists on admin tenant, skipping insert`);
        }
      } else {
        await db.update(drinks).set({
          priceGross: drink.priceGross, taxRate: drink.taxRate, hasDeposit: drink.hasDeposit,
          depositAmount: drink.depositAmount, cupSize: drink.cupSize, color: drink.color,
          imageUrl: drink.imageUrl, sortOrder: drink.sortOrder, isActive: drink.isActive,
          isPourDrink: drink.isPourDrink, group: drink.group,
        }).where(eq(drinks.id, existingDrink[0].id));
      }
    }

    // 3. Becher-Zähler sync
    const adminCups = await db.select().from(cupCounters).where(eq(cupCounters.tenantId, ADMIN_TENANT));
    const lipaCups = await db.select().from(cupCounters).where(eq(cupCounters.tenantId, lipaTenantId));

    for (const cup of adminCups) {
      const spName = adminIdToName.get(cup.salesPointId);
      if (!spName) continue;
      const lipaSPId = lipaNameToId.get(spName);
      if (!lipaSPId) continue;
      await db.execute(sql`
        INSERT INTO cup_counters (tenant_id, sales_point_id, size, given, created_at)
        VALUES (${lipaTenantId}, ${lipaSPId}, ${cup.size}, ${cup.given}, now())
        ON CONFLICT (tenant_id, sales_point_id, size) DO UPDATE SET given = ${cup.given}
      `);
      stats.cups++;
    }

    for (const cup of lipaCups) {
      const spName = lipaIdToName.get(cup.salesPointId);
      if (!spName) continue;
      const adminSPId = adminNameToId.get(spName);
      if (!adminSPId) continue;
      await db.execute(sql`
        INSERT INTO cup_counters (tenant_id, sales_point_id, size, given, created_at)
        VALUES (${ADMIN_TENANT}, ${adminSPId}, ${cup.size}, ${cup.given}, now())
        ON CONFLICT (tenant_id, sales_point_id, size) DO UPDATE SET given = ${cup.given}
      `);
      stats.cups++;
    }

    return NextResponse.json({
      message: `Sync abgeschlossen: ${stats.drinks} Getränke, ${stats.salesPoints} Verkaufsstellen, ${stats.cups} Becher synchronisiert`,
      stats,
    });
  } catch (error) {
    console.error("Seed/Sync error:", error);
    return NextResponse.json({ error: "Interner Serverfehler", details: String(error) }, { status: 500 });
  }
}
