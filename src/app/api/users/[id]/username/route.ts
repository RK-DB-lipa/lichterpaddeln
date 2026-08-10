import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { managedUsers } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nur Admin kann Usernamen ändern" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    const body = await req.json();
    const { username } = body;

    if (!username || username.trim().length < 3) {
      return NextResponse.json({ error: "Username muss mindestens 3 Zeichen haben" }, { status: 400 });
    }

    // Prüfen ob User existiert
    const user = await db
      .select()
      .from(managedUsers)
      .where(eq(managedUsers.id, userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
    }

    // Prüfen ob Username bereits vergeben
    const existing = await db
      .select()
      .from(managedUsers)
      .where(eq(managedUsers.username, username.trim()))
      .limit(1);

    if (existing.length > 0 && existing[0].id !== userId) {
      return NextResponse.json({ error: "Username bereits vergeben" }, { status: 400 });
    }

    // Username aktualisieren
    await db
      .update(managedUsers)
      .set({ username: username.trim() })
      .where(eq(managedUsers.id, userId));

    return NextResponse.json({ success: true, message: "Username geändert", username: username.trim() });
  } catch (error) {
    console.error("Change username error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
