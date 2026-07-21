import { NextResponse } from "next/server";
import { db } from "@/db";
import { admins, drinks, salesPoints } from "@/db/schema";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function runSetup() {
  // Seed super admin (once, global)
  const existingAdmin = await db.select().from(admins).limit(1);
  if (existingAdmin.length === 0) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await db.insert(admins).values({ username: "admin", passwordHash });
  }

  // Seed current tenant's sales points + drinks (if empty)
  const session = await getSession();
  const tenantId = session?.tenantId ?? 0;

  const existingSP = await db
    .select()
    .from(salesPoints)
    .where(eq(salesPoints.tenantId, tenantId))
    .limit(1);

  if (existingSP.length === 0) {
    const defaultSalesPoints = [
      { name: "Getränkewagen 1", sortOrder: 1, tenantId },
      { name: "Getränkewagen 2", sortOrder: 2, tenantId },
      { name: "Theke links", sortOrder: 3, tenantId },
      { name: "Theke rechts", sortOrder: 4, tenantId },
    ];
    await db.insert(salesPoints).values(defaultSalesPoints);
  }

  const existingDrinks = await db
    .select()
    .from(drinks)
    .where(eq(drinks.tenantId, tenantId))
    .limit(1);

  if (existingDrinks.length === 0) {
    const defaultDrinks = [
      { name: "Pils", priceNet: 2.5, taxRate: 19, color: "#F59E0B", cupSize: "04", sortOrder: 1, tenantId },
      { name: "Weizen", priceNet: 2.8, taxRate: 19, color: "#EAB308", cupSize: "04", sortOrder: 2, tenantId },
      { name: "Cola", priceNet: 2.0, taxRate: 19, color: "#DC2626", cupSize: "02", sortOrder: 3, tenantId },
      { name: "Fanta", priceNet: 2.0, taxRate: 19, color: "#F97316", cupSize: "02", sortOrder: 4, tenantId },
      { name: "Wasser", priceNet: 1.5, taxRate: 19, color: "#3B82F6", cupSize: "02", sortOrder: 5, tenantId },
      { name: "Schorle", priceNet: 2.0, taxRate: 7, color: "#10B981", cupSize: "02", sortOrder: 6, tenantId },
      { name: "Kaffee", priceNet: 1.8, taxRate: 7, color: "#78350F", cupSize: "02", sortOrder: 7, tenantId },
    ];
    await db.insert(drinks).values(
      defaultDrinks.map((d) => ({ ...d, hasDeposit: true, depositAmount: 2.0 }))
    );
  }

  return NextResponse.json({ message: "Setup abgeschlossen (Tenant " + tenantId + ")" });
}

export async function GET() {
  try {
    return await runSetup();
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function POST() {
  try {
    return await runSetup();
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
