import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { salesPoints } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";

// GET: Public - list active sales points
export async function GET() {
  try {
    const points = await db
      .select()
      .from(salesPoints)
      .where(eq(salesPoints.isActive, true))
      .orderBy(asc(salesPoints.sortOrder));
    return NextResponse.json(points);
  } catch (error) {
    console.error("GET /api/sales-points error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

// POST: Admin only - create a sales point
export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { name, sortOrder } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name ist erforderlich" },
        { status: 400 }
      );
    }

    const existing = await db.select().from(salesPoints);
    const [point] = await db
      .insert(salesPoints)
      .values({
        name,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : existing.length,
      })
      .returning();

    return NextResponse.json(point, { status: 201 });
  } catch (error) {
    console.error("POST /api/sales-points error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
