import { NextResponse } from "next/server";
import { db } from "@/db";
import { drinks } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

/**
 * POST /api/admin/debug-insert
 * Testet, ob ein einzelnes Getränk auf tenantId=2 eingefügt werden kann.
 * Zeigt den genauen PostgreSQL-Fehler an.
 */
export async function POST() {
  try {
    const admin = await getAuthAdmin();
    if (!admin) return NextResponse.json({ error: "Nur für Super-Admin" }, { status: 401 });

    const LIPA_TENANT = 2;
    const results: any[] = [];

    // TEST 1: Minimal-Insert mit allen Spalten
    results.push('=== TEST 1: Minimal-Insert ===');
    try {
      const [result] = await db.insert(drinks).values({
        tenantId: LIPA_TENANT,
        name: 'Test-Getränk',
        priceGross: 2.5,
        taxRate: 19,
        hasDeposit: true,
        depositAmount: 2,
        cupSize: '04',
        color: '#3B82F6',
        imageUrl: null,
        sortOrder: 0,
        isActive: true,
        isPourDrink: false,
        group: 'Test',
      }).returning();
      results.push(`✓ Erfolg: ID=${result.id}, Name=${result.name}`);
      
      // Cleanup
      await db.delete(drinks).where(eq(drinks.id, result.id));
      results.push('✓ Cleanup erfolgreich');
    } catch (err: any) {
      results.push(`❌ Fehler:`);
      results.push(`  Message: ${err?.message}`);
      results.push(`  Code: ${err?.code || 'Kein Code'}`);
      results.push(`  Detail: ${err?.detail || 'Kein Detail'}`);
      results.push(`  Hint: ${err?.hint || 'Kein Hint'}`);
      results.push(`  Constraint: ${err?.constraint || 'Kein Constraint'}`);
      results.push(`  Cause: ${err?.cause || 'Kein Cause'}`);
      results.push(`  Stack: ${err?.stack?.split('\n').slice(0, 5).join('\n')}`);
    }

    // TEST 2: Prüfe Schema der drinks-Tabelle
    results.push('\n=== TEST 2: Schema-Check ===');
    try {
      const schemaInfo = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'drinks'
        ORDER BY ordinal_position
      `);
      results.push('✓ Spalten der drinks-Tabelle:');
      const rows = (schemaInfo as unknown) as any[];
      rows.forEach(col => {
        results.push(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
      });
    } catch (err: any) {
      results.push(`❌ Schema-Check Fehler: ${err?.message}`);
    }

    // TEST 3: Prüfe ob Daten auf tenantId=2 gelöscht wurden
    results.push('\n=== TEST 3: Existierende Daten auf tenantId=2 ===');
    try {
      const existing = await db.select().from(drinks).where(eq(drinks.tenantId, LIPA_TENANT));
      results.push(`✓ ${existing.length} Getränke auf tenantId=${LIPA_TENANT}`);
      if (existing.length > 0) {
        results.push('  Erste 3:');
        existing.slice(0, 3).forEach(d => {
          results.push(`    - ${d.name} (ID: ${d.id})`);
        });
      }
    } catch (err: any) {
      results.push(`❌ Query-Fehler: ${err?.message}`);
    }

    return NextResponse.json({
      success: true,
      results: results.join('\n'),
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ 
      error: "Interner Serverfehler", 
      details: String(error) 
    }, { status: 500 });
  }
}
