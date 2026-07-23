import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drinks } from "@/db/schema";
import { getSession, getAuthAdmin } from "@/lib/auth";
import { eq, and, asc } from "drizzle-orm";

// POST: Getränke neu sortieren (move)
// body: { drinkId: number, action: "top" | "up" | "down" | "bottom" }
export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { drinkId, action } = body;
    if (!drinkId || !action) {
      return NextResponse.json({ error: "drinkId und action erforderlich" }, { status: 400 });
    }

    // Alle aktiven Getränke des Tenants holen (sortiert nach sortOrder)
    const allDrinks = await db
      .select({ id: drinks.id, sortOrder: drinks.sortOrder })
      .from(drinks)
      .where(and(eq(drinks.tenantId, tenantId), eq(drinks.isActive, true)))
      .orderBy(asc(drinks.sortOrder));

    const ids = allDrinks.map((d) => d.id);
    const currentIndex = ids.indexOf(drinkId);
    if (currentIndex === -1) return NextResponse.json({ error: "Getränk nicht gefunden" }, { status: 404 });

    let targetIndex = currentIndex;
    if (action === "top") targetIndex = 0;
    else if (action === "up") targetIndex = Math.max(0, currentIndex - 1);
    else if (action === "down") targetIndex = Math.min(ids.length - 1, currentIndex + 1);
    else if (action === "bottom") targetIndex = ids.length - 1;
    else return NextResponse.json({ error: "Unbekannte action" }, { status: 400 });

    // Neues Array erstellen mit verschobenem Element
    const newOrder = [...ids];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, moved);

    // sortOrder-Werte aktualisieren (0, 1, 2, 3, ...)
    for (let i = 0; i < newOrder.length; i++) {
      await db.update(drinks).set({ sortOrder: i }).where(eq(drinks.id, newOrder[i]));
    }

    return NextResponse.json({ success: true, newOrder });
  } catch (error) {
    console.error("POST /api/drinks/sort error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
