import { NextResponse } from "next/server";
import { db } from "@/db";
import { pourQueue, pourStats } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    await db.delete(pourQueue).where(eq(pourQueue.tenantId, tenantId));
    await db.delete(pourStats).where(eq(pourStats.tenantId, tenantId));

    return NextResponse.json({ success: true, message: "Zapf-Zähler zurückgesetzt" });
  } catch (error) {
    console.error("POST /api/pour/reset error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
