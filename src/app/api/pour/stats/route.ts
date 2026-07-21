import { NextResponse } from "next/server";
import { db } from "@/db";
import { pourStats } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    const tenantId = session?.tenantId ?? 0;

    const stats = await db
      .select()
      .from(pourStats)
      .where(eq(pourStats.tenantId, tenantId))
      .orderBy(desc(pourStats.totalPoured));

    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/pour/stats error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
