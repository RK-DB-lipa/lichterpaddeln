import { NextResponse } from "next/server";
import { db } from "@/db";
import { pourStats, pourQueue } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";

// POST: Admin only - reset all pour stats and queues
export async function POST() {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    await db.delete(pourStats);
    await db.delete(pourQueue);

    return NextResponse.json({
      success: true,
      message: "Alle Zapf-Zähler zurückgesetzt",
    });
  } catch (error) {
    console.error("POST /api/pour/reset error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
