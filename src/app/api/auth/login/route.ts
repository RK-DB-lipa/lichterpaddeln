import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins, managedUsers } from "@/db/schema";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { username, password, displayName } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Benutzername und Passwort erforderlich" }, { status: 400 });
    }

    // 1) Super admin
    const admin = await db
      .select()
      .from(admins)
      .where(eq(admins.username, username))
      .limit(1);

    if (admin.length > 0 && (await bcrypt.compare(password, admin[0].passwordHash))) {
      const token = await signToken({
        role: "admin",
        username: admin[0].username,
        tenantId: 0,
        displayName: displayName || admin[0].username,
      });
      const response = NextResponse.json({ success: true, displayName: displayName || admin[0].username });
      response.cookies.set("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      });
      return response;
    }

    // 2) Licensed users
    const user = await db
      .select()
      .from(managedUsers)
      .where(eq(managedUsers.username, username))
      .limit(1);

    if (user.length > 0 && (await bcrypt.compare(password, user[0].passwordHash))) {
      if (!user[0].isActive) {
        return NextResponse.json({ error: "Konto ist deaktiviert" }, { status: 403 });
      }
      // expiresAt null = permanent (z.B. Lipa-User)
      if (user[0].expiresAt && new Date(user[0].expiresAt).getTime() < Date.now()) {
        return NextResponse.json(
          { error: `Lizenz abgelaufen am ${new Date(user[0].expiresAt).toLocaleDateString("de-DE")}` },
          { status: 403 }
        );
      }

      const token = await signToken({
        role: "user",
        username: user[0].username,
        userId: user[0].id,
        tenantId: user[0].id,
        displayName: displayName || user[0].username,
      });
      const response = NextResponse.json({ success: true, displayName: displayName || user[0].username });
      response.cookies.set("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      });
      return response;
    }

    return NextResponse.json({ error: "Ungültige Zugangsdaten" }, { status: 401 });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
