import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cupCounters } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const admin = await getSession();
    if (!admin) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = admin.tenantId;

    const body = await req.json();
    const { salesPointId } = body;

    if (salesPointId) {
      await db
        .delete(cupCounters)
        .where(
          and(
            eq(cupCounters.tenantId, tenantId),
            eq(cupCounters.salesPointId, parseInt(salesPointId))
          )
        );
    } else {
      await db.delete(cupCounters).where(eq(cupCounters.tenantId, tenantId));
    }

    return NextResponse.json({ success: true, message: "Becher-Zähler zurückgesetzt" });
  } catch (error) {
    console.error("POST /api/cups/reset error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
