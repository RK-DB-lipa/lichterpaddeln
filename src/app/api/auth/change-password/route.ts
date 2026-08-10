import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins, managedUsers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword, userId } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Neues Passwort muss mindestens 6 Zeichen haben" }, { status: 400 });
    }

    // Admin ändert Passwort eines anderen Users
    if (session.role === "admin" && userId) {
      // Prüfen ob User existiert
      const targetUser = await db
        .select()
        .from(managedUsers)
        .where(eq(managedUsers.id, userId))
        .limit(1);

      if (targetUser.length === 0) {
        return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
      }

      // Neues Passwort hashen und speichern
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db
        .update(managedUsers)
        .set({ passwordHash })
        .where(eq(managedUsers.id, userId));

      return NextResponse.json({ success: true, message: "Passwort geändert" });
    }

    // User ändert eigenes Passwort
    if (!currentPassword) {
      return NextResponse.json({ error: "Aktuelles Passwort erforderlich" }, { status: 400 });
    }

    // Prüfen ob User oder Admin
    if (session.role === "admin" && session.userId === undefined) {
      // Super-Admin (admins Tabelle)
      const admin = await db
        .select()
        .from(admins)
        .where(eq(admins.id, session.tenantId))
        .limit(1);

      if (admin.length === 0) {
        return NextResponse.json({ error: "Admin nicht gefunden" }, { status: 404 });
      }

      // Aktuelles Passwort prüfen
      const isValid = await bcrypt.compare(currentPassword, admin[0].passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Aktuelles Passwort falsch" }, { status: 401 });
      }

      // Neues Passwort hashen und speichern
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db
        .update(admins)
        .set({ passwordHash })
        .where(eq(admins.id, session.tenantId));

      return NextResponse.json({ success: true, message: "Passwort geändert" });
    } else {
      // Normaler User (managedUsers Tabelle)
      const user = await db
        .select()
        .from(managedUsers)
        .where(eq(managedUsers.id, session.userId))
        .limit(1);

      if (user.length === 0) {
        return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
      }

      // Aktuelles Passwort prüfen
      const isValid = await bcrypt.compare(currentPassword, user[0].passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Aktuelles Passwort falsch" }, { status: 401 });
      }

      // Neues Passwort hashen und speichern
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db
        .update(managedUsers)
        .set({ passwordHash })
        .where(eq(managedUsers.id, session.userId));

      return NextResponse.json({ success: true, message: "Passwort geändert" });
    }
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
