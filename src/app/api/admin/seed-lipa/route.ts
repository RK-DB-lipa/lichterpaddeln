import { NextResponse } from "next/server";
import { db } from "@/db";
import { managedUsers } from "@/db/schema";
import { getAuthAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

// POST: Erstelle permanenten Lipa-User (nur Super-Admin)
// Dieser User hat keine Ablaufzeit und keine Super-Admin-Rechte.
export async function POST() {
  try {
    const admin = await getAuthAdmin();
    if (!admin) return NextResponse.json({ error: "Nur für Super-Admin" }, { status: 401 });

    // Prüfen ob Lipa bereits existiert
    const existing = await db.select().from(managedUsers).where(eq(managedUsers.username, "Lipa")).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ message: "Lipa existiert bereits", userId: existing[0].id });
    }

    const passwordHash = await bcrypt.hash("Lipa456", 10);
    const [user] = await db.insert(managedUsers).values({
      username: "Lipa",
      passwordHash,
      isActive: true,
      expiresAt: null, // permanent – läuft nie ab
    }).returning();

    return NextResponse.json({
      message: "Lipa-User erfolgreich angelegt (permanent, ohne Super-Admin)",
      userId: user.id,
      credentials: { username: "Lipa", password: "Lipa456" },
    });
  } catch (error) {
    console.error("Seed Lipa error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
