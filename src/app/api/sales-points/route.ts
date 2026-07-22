import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { salesPoints } from "@/db/schema";
import { getSession, getAuthAdmin } from "@/lib/auth";
import { eq, and, asc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const points = await db
      .select()
      .from(salesPoints)
      .where(and(eq(salesPoints.tenantId, tenantId), eq(salesPoints.isActive, true)))
      .orderBy(asc(salesPoints.sortOrder));

    return NextResponse.json(points);
  } catch (error) {
    console.error("GET /api/sales-points error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
    const session = await getSession();
    const tenantId = session?.tenantId ?? 0;

    const body = await req.json();
    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(salesPoints)
      .where(eq(salesPoints.tenantId, tenantId));

    const [point] = await db
      .insert(salesPoints)
      .values({
        tenantId,
        name,
        sortOrder: existing.length,
      })
      .returning();

    return NextResponse.json(point, { status: 201 });
  } catch (error) {
    console.error("POST /api/sales-points error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
