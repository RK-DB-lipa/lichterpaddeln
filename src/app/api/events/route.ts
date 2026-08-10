import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventDrinks, eventFoods } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, gte, lte, or, sql } from "drizzle-orm";

// GET: Events für den aktuellen Tenant
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("active") === "true";
    const currentDate = url.searchParams.get("date");

    let query = db.select().from(events).where(eq(events.tenantId, tenantId));

    if (activeOnly) {
      query = query.where(eq(events.isActive, true)) as any;
    }

    if (currentDate) {
      const date = new Date(currentDate);
      query = query.where(
        and(
          lte(events.startDate, date),
          gte(events.endDate, date),
          eq(events.isActive, true)
        )
      ) as any;
    }

    const allEvents = await query.orderBy(events.startDate);

    // Für jedes Event: Anzahl Drinks und Foods ermitteln
    const eventsWithCounts = await Promise.all(
      allEvents.map(async (event) => {
        const drinkCount = await db.execute(
          sql`SELECT count(*) as count FROM event_drinks WHERE event_id = ${event.id}`
        );
        const foodCount = await db.execute(
          sql`SELECT count(*) as count FROM event_foods WHERE event_id = ${event.id}`
        );
        return {
          ...event,
          drinkCount: (drinkCount as any)?.[0]?.count || 0,
          foodCount: (foodCount as any)?.[0]?.count || 0,
        };
      })
    );

    return NextResponse.json(eventsWithCounts);
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST: Neues Event anlegen
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { name, startDate, endDate } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Name, startDate und endDate erforderlich" }, { status: 400 });
    }

    const [event] = await db
      .insert(events)
      .values({
        tenantId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true,
      })
      .returning();

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("POST /api/events error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
