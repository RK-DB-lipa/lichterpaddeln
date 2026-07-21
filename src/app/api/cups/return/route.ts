import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cupCounters } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const tenantId = session?.tenantId ?? 0;
    const body = await req.json();
    const { salesPointId, size, count } = body;

    if (!salesPointId || !size || !count) {
      return NextResponse.json({ error: "salesPointId, size und count erforderlich" }, { status: 400 });
    }
    if (size !== "02" && size !== "04") {
      return NextResponse.json({ error: "size muss '02' oder '04' sein" }, { status: 400 });
    }

    // Rückgabe = returned wird erhöht (separater Zähler)
    await db.execute(sql`
      INSERT INTO cup_counters (tenant_id, sales_point_id, size, given, returned, created_at)
      VALUES (${tenantId}, ${parseInt(salesPointId)}, ${size}, 0, ${parseInt(count)}, now())
      ON CONFLICT (tenant_id, sales_point_id, size)
      DO UPDATE SET returned = cup_counters.returned + ${parseInt(count)}
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/cups/return error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
