import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("active") === "true";
    const date = url.searchParams.get("date");

    const conditions = [eq(events.tenantId, tenantId)];
    if (activeOnly) conditions.push(eq(events.isActive, true));
    if (date) {
      const eventDate = new Date(date);
      conditions.push(lte(events.startDate, eventDate));
      conditions.push(gte(events.endDate, eventDate));
    }

    const allEvents = await db.select().from(events).where(and(...conditions)).orderBy(events.startDate);
    return NextResponse.json(allEvents);
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { name, startDate, endDate, employeeDiscountPercent } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Name, Start- und Enddatum erforderlich" }, { status: 400 });
    }

    const discountValue = parseFloat(employeeDiscountPercent || "0");

    const [event] = await db
      .insert(events)
      .values({
        tenantId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        employeeDiscountPercent: discountValue,
      })
      .returning();

    return NextResponse.json({ ...event, debug: { received: body, parsed: discountValue } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events error:", error);
    return NextResponse.json({ error: "Interner Serverfehler: " + error }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const url = new URL(req.url);
    const eventId = url.pathname.split("/").pop();
    if (!eventId) return NextResponse.json({ error: "Event-ID erforderlich" }, { status: 400 });

    const body = await req.json();
    const { name, startDate, endDate, isActive, employeeDiscountPercent } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;
    
    if (employeeDiscountPercent !== undefined) {
      updateData.employeeDiscountPercent = parseFloat(employeeDiscountPercent || "0");
    }

    const [updatedEvent] = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, parseInt(eventId)))
      .returning();

    // ✅ DEBUG: Wir senden die verarbeiteten Daten zurück an das Frontend!
    return NextResponse.json({ 
      success: true, 
      updatedEvent,
      debug: {
        receivedBody: body,
        updateDataSentToDB: updateData
      }
    });
  } catch (error) {
    console.error("PUT /api/events error:", error);
    return NextResponse.json({ error: "Interner Serverfehler: " + error }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const url = new URL(req.url);
    const eventId = url.pathname.split("/").pop();
    if (!eventId) return NextResponse.json({ error: "Event-ID erforderlich" }, { status: 400 });

    await db.delete(events).where(eq(events.id, parseInt(eventId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/events error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
