import { NextResponse } from "next/server";
import { db } from "@/db";
import { cupCounters, salesPoints } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    // Alle Zähler (given + returned) für diese Tenant
    const results = await db
      .select()
      .from(cupCounters)
      .where(eq(cupCounters.tenantId, tenantId));

    // Build map per sales point
    const map = new Map<number, { given02: number; given04: number; returned02: number; returned04: number }>();

    const points = await db
      .select({ id: salesPoints.id })
      .from(salesPoints)
      .where(and(eq(salesPoints.tenantId, tenantId), eq(salesPoints.isActive, true)));

    for (const p of points) {
      map.set(p.id, { given02: 0, given04: 0, returned02: 0, returned04: 0 });
    }

    for (const r of results) {
      const entry = map.get(r.salesPointId) ?? { given02: 0, given04: 0, returned02: 0, returned04: 0 };
      if (r.size === "02") {
        entry.given02 += r.given;
        entry.returned02 += r.returned;
      } else {
        entry.given04 += r.given;
        entry.returned04 += r.returned;
      }
      map.set(r.salesPointId, entry);
    }

    const counters = Array.from(map.entries()).map(([salesPointId, data]) => ({
      salesPointId,
      ...data,
    }));

    return NextResponse.json(counters);
  } catch (error) {
    console.error("GET /api/cups error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
