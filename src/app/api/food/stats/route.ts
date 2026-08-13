import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { foodStats } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const stats = await db
      .select({
        foodName: foodStats.foodName,
        totalCooked: sql<number>`sum(${foodStats.quantity})`.as("total_cooked"),
      })
      .from(foodStats)
      .where(eq(foodStats.tenantId, tenantId))
      .groupBy(foodStats.foodName)
      .orderBy(desc(sql`sum(${foodStats.quantity})`));

    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/food/stats error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
