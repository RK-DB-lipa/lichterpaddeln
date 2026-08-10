import { NextResponse } from "next/server";
import { db } from "@/db";
import { foodStats } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

// GET: Get total cooked food stats
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const stats = await db
      .select()
      .from(foodStats)
      .where(eq(foodStats.tenantId, tenantId))
      .orderBy(desc(foodStats.totalCooked));

    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/food/stats error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
