import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drinks } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

// GET: Alle eindeutigen Gruppen für den aktuellen Tenant
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const tenantId = session.tenantId;

    // Alle Getränke mit Gruppen für diesen Tenant
    const allDrinks = await db
      .select({ group: drinks.group })
      .from(drinks)
      .where(and(eq(drinks.tenantId, tenantId), eq(drinks.isActive, true)));

    // Eindeutige Gruppen extrahieren
    const groups = Array.from(new Set(allDrinks.map(d => d.group).filter(g => g !== null))) as string[];

    return NextResponse.json(groups);
  } catch (error) {
    console.error("GET /api/groups error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST: Gruppe verschieben (sortOrder aktualisieren für alle Getränke dieser Gruppe)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const tenantId = session.tenantId;
    const body = await req.json();
    const { group, action } = body;

    if (!group || !action) {
      return NextResponse.json({ error: "group und action erforderlich" }, { status: 400 });
    }

    // Alle Getränke dieser Gruppe für diesen Tenant
    const groupDrinks = await db
      .select({ id: drinks.id, sortOrder: drinks.sortOrder })
      .from(drinks)
      .where(and(eq(drinks.tenantId, tenantId), eq(drinks.group, group), eq(drinks.isActive, true)))
      .orderBy(drinks.sortOrder);

    if (groupDrinks.length === 0) {
      return NextResponse.json({ error: "Gruppe nicht gefunden" }, { status: 404 });
    }

    // Aktuelle Position der Gruppe (basierend auf erstem Getränk)
    const currentMinSort = Math.min(...groupDrinks.map(d => d.sortOrder));

    // Alle Getränke für diesen Tenant (um Nachbarn zu finden)
    const allDrinks = await db
      .select({ id: drinks.id, group: drinks.group, sortOrder: drinks.sortOrder })
      .from(drinks)
      .where(and(eq(drinks.tenantId, tenantId), eq(drinks.isActive, true)))
      .orderBy(drinks.sortOrder);

    // Eindeutige Gruppen in sortierter Reihenfolge
    const uniqueGroups: string[] = [];
    for (const d of allDrinks) {
      if (d.group && !uniqueGroups.includes(d.group)) {
        uniqueGroups.push(d.group);
      }
    }

    const currentIndex = uniqueGroups.indexOf(group);
    if (currentIndex === -1) {
      return NextResponse.json({ error: "Gruppe nicht gefunden" }, { status: 404 });
    }

    let targetIndex = currentIndex;
    if (action === "top") targetIndex = 0;
    else if (action === "up") targetIndex = Math.max(0, currentIndex - 1);
    else if (action === "down") targetIndex = Math.min(uniqueGroups.length - 1, currentIndex + 1);
    else if (action === "bottom") targetIndex = uniqueGroups.length - 1;
    else return NextResponse.json({ error: "Unbekannte action" }, { status: 400 });

    if (targetIndex === currentIndex) {
      return NextResponse.json({ success: true, message: "Keine Änderung" });
    }

    // Neue Gruppen-Reihenfolge erstellen
    const newOrder = [...uniqueGroups];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, moved);

    // SortOrder für alle Getränke aktualisieren
    let sortCounter = 0;
    for (const groupName of newOrder) {
      const drinksInGroup = allDrinks.filter(d => d.group === groupName);
      for (const drink of drinksInGroup) {
        await db.update(drinks).set({ sortOrder: sortCounter }).where(eq(drinks.id, drink.id));
        sortCounter++;
      }
    }

    return NextResponse.json({ success: true, newOrder });
  } catch (error) {
    console.error("POST /api/groups/sort error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
