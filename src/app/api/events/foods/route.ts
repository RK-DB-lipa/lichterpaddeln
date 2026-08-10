import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventFoods, foods } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

// GET: Foods für ein bestimmtes Event
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const url = new URL(req.url);
    const eventId = url.searchParams.get("eventId");
    if (!eventId) return NextResponse.json({ error: "eventId erforderlich" }, { status: 400 });

    const assignedFoods = await db
      .select({ foodId: eventFoods.foodId })
      .from(eventFoods)
      .where(eq(eventFoods.eventId, parseInt(eventId)));

    const foodIds = assignedFoods.map((f) => f.foodId);

    return NextResponse.json(foodIds);
  } catch (error) {
    console.error("GET /api/events/foods error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST: Foods einem Event zuweisen
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const body = await req.json();
    const { eventId, foodIds } = body;

    if (!eventId || !foodIds || !Array.isArray(foodIds)) {
      return NextResponse.json({ error: "eventId und foodIds erforderlich" }, { status: 400 });
    }

    // Erst alle bestehenden Zuordnungen löschen
    await db.delete(eventFoods).where(eq(eventFoods.eventId, eventId));

    // Dann neue Zuordnungen hinzufügen
    if (foodIds.length > 0) {
      await db.insert(eventFoods).values(
        foodIds.map((foodId: number) => ({ eventId, foodId }))
      );
    }

    return NextResponse.json({ success: true, count: foodIds.length });
  } catch (error) {
    console.error("POST /api/events/foods error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
