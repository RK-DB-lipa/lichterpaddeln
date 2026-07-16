import { NextResponse } from "next/server";
import { db } from "@/db";
import { pourStats } from "@/db/schema";
import { desc } from "drizzle-orm";

// GET: Get total poured stats (event-wide)
export async function GET() {
  try {
    const stats = await db
      .select()
      .from(pourStats)
      .orderBy(desc(pourStats.totalPoured));
    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/pour/stats error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
