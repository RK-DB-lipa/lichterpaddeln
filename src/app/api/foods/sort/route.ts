import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { foods } from "@/db/schema";
import { getSession, getAuthAdmin } from "@/lib/auth";
import { eq, and, asc } from "drizzle-orm";

// POST: Foods neu sortieren
// body: { foodId: number, action: "top" | "up" | "down" | "bottom" }
export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { foodId, action } = body;
    if (!foodId || !action) {
      return NextResponse.json({ error: "foodId und action erforderlich" }, { status: 400 });
    }

    const allFoods = await db
      .select({ id: foods.id, sortOrder: foods.sortOrder })
      .from(foods)
      .where(and(eq(foods.tenantId, tenantId), eq(foods.isActive, true)))
      .orderBy(asc(foods.sortOrder));

    const ids = allFoods.map((f) => f.id);
    const currentIndex = ids.indexOf(foodId);
    if (currentIndex === -1) return NextResponse.json({ error: "Food nicht gefunden" }, { status: 404 });

    let targetIndex = currentIndex;
    if (action === "top") targetIndex = 0;
    else if (action === "up") targetIndex = Math.max(0, currentIndex - 1);
    else if (action === "down") targetIndex = Math.min(ids.length - 1, currentIndex + 1);
    else if (action === "bottom") targetIndex = ids.length - 1;
    else return NextResponse.json({ error: "Unbekannte action" }, { status: 400 });

    const newOrder = [...ids];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, moved);

    for (let i = 0; i < newOrder.length; i++) {
      await db.update(foods).set({ sortOrder: i }).where(eq(foods.id, newOrder[i]));
    }

    return NextResponse.json({ success: true, newOrder });
  } catch (error) {
    console.error("POST /api/foods/sort error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
