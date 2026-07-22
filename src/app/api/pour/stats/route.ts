import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pourStats } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;
    const url = new URL(req.url);
    const salesPointId = url.searchParams.get("salesPointId");
    const pourerName = url.searchParams.get("pourerName");

    const conditions = [eq(pourStats.tenantId, tenantId)];
    if (salesPointId) conditions.push(eq(pourStats.salesPointId, parseInt(salesPointId)));
    if (pourerName) conditions.push(eq(pourStats.pourerName, pourerName));

    const where = and(...conditions);

    // Aggregate by drink for the chart display
    const stats = await db
      .select({
        drinkName: pourStats.drinkName,
        totalPoured: sql`sum(${pourStats.totalPoured})`,
      })
      .from(pourStats)
      .where(where)
      .groupBy(pourStats.drinkName)
      .orderBy(desc(sql`sum(${pourStats.totalPoured})`));

    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/pour/stats error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
