import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, pourStats } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "cashier"; // "cashier" | "pourer"

    if (type === "pourer") {
      const names = await db
        .select({ name: pourStats.pourerName })
        .from(pourStats)
        .where(eq(pourStats.tenantId, tenantId))
        .groupBy(pourStats.pourerName)
        .orderBy(sql`1`);
      return NextResponse.json(names.map((n) => n.name).filter(Boolean));
    }

    // cashier names
    const names = await db
      .select({ name: orders.cashierName })
      .from(orders)
      .where(eq(orders.tenantId, tenantId))
      .groupBy(orders.cashierName)
      .orderBy(sql`1`);

    return NextResponse.json(names.map((n) => n.name).filter(Boolean));
  } catch (error) {
    console.error("GET /api/names error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
