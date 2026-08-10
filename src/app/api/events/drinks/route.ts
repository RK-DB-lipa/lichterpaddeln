import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventDrinks, drinks } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// GET: Drinks für ein bestimmtes Event
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const url = new URL(req.url);
    const eventId = url.searchParams.get("eventId");
    if (!eventId) return NextResponse.json({ error: "eventId erforderlich" }, { status: 400 });

    const assignedDrinks = await db
      .select({ drinkId: eventDrinks.drinkId })
      .from(eventDrinks)
      .where(eq(eventDrinks.eventId, parseInt(eventId)));

    const drinkIds = assignedDrinks.map((d) => d.drinkId);

    return NextResponse.json(drinkIds);
  } catch (error) {
    console.error("GET /api/events/drinks error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST: Drinks einem Event zuweisen
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { eventId, drinkIds } = body;

    if (!eventId || !drinkIds || !Array.isArray(drinkIds)) {
      return NextResponse.json({ error: "eventId und drinkIds erforderlich" }, { status: 400 });
    }

    // Erst alle bestehenden Zuordnungen löschen
    await db.delete(eventDrinks).where(eq(eventDrinks.eventId, eventId));

    // Dann neue Zuordnungen hinzufügen
    if (drinkIds.length > 0) {
      await db.insert(eventDrinks).values(
        drinkIds.map((drinkId: number) => ({ eventId, drinkId }))
      );
    }

    return NextResponse.json({ success: true, count: drinkIds.length });
  } catch (error) {
    console.error("POST /api/events/drinks error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
