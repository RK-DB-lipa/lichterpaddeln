import { NextResponse } from "next/server";
import { db } from "@/db";
import { admins, drinks, salesPoints } from "@/db/schema";
import bcrypt from "bcryptjs";

async function runSetup() {
  // Check if admin already exists
  const existing = await db.select().from(admins).limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { message: "Admin bereits vorhanden" },
      { status: 200 }
    );
  }

  // Create default admin
  const passwordHash = await bcrypt.hash("admin123", 10);
  await db.insert(admins).values({
    username: "admin",
    passwordHash,
  });

  // Seed default sales points
  const defaultSalesPoints = [
    { name: "Getränkewagen 1", sortOrder: 1 },
    { name: "Getränkewagen 2", sortOrder: 2 },
    { name: "Theke links", sortOrder: 3 },
    { name: "Theke rechts", sortOrder: 4 },
  ];
  await db.insert(salesPoints).values(defaultSalesPoints);

  // Seed default drinks
  const defaultDrinks = [
    { name: "Pils", priceNet: 2.5, taxRate: 19, color: "#F59E0B", sortOrder: 1 },
    { name: "Weizen", priceNet: 2.8, taxRate: 19, color: "#EAB308", sortOrder: 2 },
    { name: "Cola", priceNet: 2.0, taxRate: 19, color: "#DC2626", sortOrder: 3 },
    { name: "Fanta", priceNet: 2.0, taxRate: 19, color: "#F97316", sortOrder: 4 },
    { name: "Wasser", priceNet: 1.5, taxRate: 19, color: "#3B82F6", sortOrder: 5 },
    { name: "Schorle", priceNet: 2.0, taxRate: 7, color: "#10B981", sortOrder: 6 },
    { name: "Kaffee", priceNet: 1.8, taxRate: 7, color: "#78350F", sortOrder: 7 },
  ];

  await db.insert(drinks).values(
    defaultDrinks.map((d) => ({
      ...d,
      hasDeposit: true,
      depositAmount: 2.0,
    }))
  );

  return NextResponse.json({
    message: "Admin, Verkaufsstellen und Standard-Getränke erstellt",
    adminCredentials: { username: "admin", password: "admin123" },
  });
}

// GET: Allow browser navigation for setup
export async function GET() {
  try {
    return await runSetup();
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

// POST: Original method
export async function POST() {
  try {
    return await runSetup();
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
