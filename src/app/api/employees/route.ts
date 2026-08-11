import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees, employeeAliases } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// GET: Alle Mitarbeiter mit ihren Aliasen
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const allEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.tenantId, tenantId))
      .orderBy(employees.displayName);

    const allAliases = await db
      .select()
      .from(employeeAliases)
      .where(eq(employeeAliases.tenantId, tenantId));

    // Aliase zu Mitarbeitern zuordnen
    const result = allEmployees.map((emp) => {
      const empAliases = allAliases.filter((a) => a.employeeId === emp.id);
      return {
        ...emp,
        aliases: empAliases.map((a) => a.aliasName),
        aliasIds: empAliases.map((a) => a.id),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/employees error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST: Neuen Mitarbeiter erstellen
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { displayName } = body;

    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json({ error: "Anzeigename erforderlich" }, { status: 400 });
    }

    const [employee] = await db
      .insert(employees)
      .values({
        tenantId,
        displayName: displayName.trim(),
      })
      .returning();

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("POST /api/employees error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
