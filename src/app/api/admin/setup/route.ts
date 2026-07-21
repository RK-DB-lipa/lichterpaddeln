import { NextResponse } from "next/server";
import { db } from "@/db";
import { admins, drinks, salesPoints } from "@/db/schema";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function runSetup() {
  const existingAdmin = await db.select().from(admins).limit(1);
  if (existingAdmin.length === 0) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await db.insert(admins).values({ username: "admin", passwordHash });
  }

  const session = await getSession();
  const tenantId = session?.tenantId ?? 0;

  const existingSP = await db.select().from(salesPoints).where(eq(salesPoints.tenantId, tenantId)).limit(1);
  if (existingSP.length === 0) {
    await db.insert(salesPoints).values([
      { name: "Getränkewagen 1", sortOrder: 1, tenantId },
      { name: "Getränkewagen 2", sortOrder: 2, tenantId },
      { name: "Theke links", sortOrder: 3, tenantId },
      { name: "Theke rechts", sortOrder: 4, tenantId },
    ]);
  }

  const existingDrinks = await db.select().from(drinks).where(eq(drinks.tenantId, tenantId)).limit(1);
  if (existingDrinks.length === 0) {
    await db.insert(drinks).values([
      { name: "Pils", priceGross: 2.98, taxRate: 19, color: "#F59E0B", cupSize: "04", sortOrder: 1, tenantId, hasDeposit: true, depositAmount: 2.0 },
      { name: "Weizen", priceGross: 3.33, taxRate: 19, color: "#EAB308", cupSize: "04", sortOrder: 2, tenantId, hasDeposit: true, depositAmount: 2.0 },
      { name: "Cola", priceGross: 2.38, taxRate: 19, color: "#DC2626", cupSize: "02", sortOrder: 3, tenantId, hasDeposit: true, depositAmount: 2.0 },
      { name: "Fanta", priceGross: 2.38, taxRate: 19, color: "#F97316", cupSize: "02", sortOrder: 4, tenantId, hasDeposit: true, depositAmount: 2.0 },
      { name: "Wasser", priceGross: 1.79, taxRate: 19, color: "#3B82F6", cupSize: "02", sortOrder: 5, tenantId, hasDeposit: true, depositAmount: 2.0 },
      { name: "Schorle", priceGross: 2.14, taxRate: 7, color: "#10B981", cupSize: "02", sortOrder: 6, tenantId, hasDeposit: true, depositAmount: 2.0 },
      { name: "Kaffee", priceGross: 1.93, taxRate: 7, color: "#78350F", cupSize: "02", sortOrder: 7, tenantId, hasDeposit: true, depositAmount: 2.0 },
    ]);
  }

  return NextResponse.json({ message: "Setup abgeschlossen (Tenant " + tenantId + ")" });
}

export async function GET() { try { return await runSetup(); } catch (error) { console.error("Setup error:", error); return NextResponse.json({ error: "Fehler" }, { status: 500 }); } }
export async function POST() { try { return await runSetup(); } catch (error) { console.error("Setup error:", error); return NextResponse.json({ error: "Fehler" }, { status: 500 }); } }
