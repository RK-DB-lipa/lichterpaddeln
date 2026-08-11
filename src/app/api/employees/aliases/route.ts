import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employeeAliases, employees } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// POST: Alias zu einem Mitarbeiter hinzufügen
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { employeeId, aliasName } = body;

    if (!employeeId || !aliasName || aliasName.trim().length === 0) {
      return NextResponse.json({ error: "employeeId und aliasName erforderlich" }, { status: 400 });
    }

    // Prüfen ob der Alias schon existiert
    const existing = await db
      .select()
      .from(employeeAliases)
      .where(and(
        eq(employeeAliases.tenantId, tenantId),
        eq(employeeAliases.aliasName, aliasName.trim())
      ))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "Alias existiert bereits" }, { status: 400 });
    }

    const [alias] = await db
      .insert(employeeAliases)
      .values({
        tenantId,
        employeeId,
        aliasName: aliasName.trim(),
      })
      .returning();

    return NextResponse.json(alias, { status: 201 });
  } catch (error) {
    console.error("POST /api/employees/aliases error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE: Alias entfernen
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const url = new URL(req.url);
    const aliasId = url.searchParams.get("id");

    if (!aliasId) {
      return NextResponse.json({ error: "Alias-ID erforderlich" }, { status: 400 });
    }

    await db
      .delete(employeeAliases)
      .where(and(
        eq(employeeAliases.id, parseInt(aliasId)),
        eq(employeeAliases.tenantId, tenantId)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/employees/aliases error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
