import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

// Idempotent migration: safe to run multiple times.
const STATEMENTS = [
  // tenantId on all scoped tables (0 = super admin, existing rows keep working)
  `ALTER TABLE sales_points ADD COLUMN IF NOT EXISTS tenant_id integer NOT NULL DEFAULT 0`,
  `ALTER TABLE drinks ADD COLUMN IF NOT EXISTS tenant_id integer NOT NULL DEFAULT 0`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id integer NOT NULL DEFAULT 0`,
  `ALTER TABLE pour_queue ADD COLUMN IF NOT EXISTS tenant_id integer NOT NULL DEFAULT 0`,
  `ALTER TABLE pour_stats ADD COLUMN IF NOT EXISTS tenant_id integer NOT NULL DEFAULT 0`,
  // cup size on drinks
  `ALTER TABLE drinks ADD COLUMN IF NOT EXISTS cup_size varchar(10) NOT NULL DEFAULT '04'`,
  // licensed users
  `CREATE TABLE IF NOT EXISTS managed_users (
    id serial PRIMARY KEY,
    username varchar(100) NOT NULL UNIQUE,
    password_hash text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    expires_at timestamp NOT NULL,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  // cup counters
  `CREATE TABLE IF NOT EXISTS cup_counters (
    id serial PRIMARY KEY,
    tenant_id integer NOT NULL DEFAULT 0,
    sales_point_id integer NOT NULL,
    size varchar(10) NOT NULL,
    given integer NOT NULL DEFAULT 0,
    returned integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS cup_counters_unique
    ON cup_counters (tenant_id, sales_point_id, size)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS pour_stats_tenant_drink_unique
    ON pour_stats (tenant_id, drink_name)`,
];

export async function POST() {
  try {
    for (const stmt of STATEMENTS) {
      await db.execute(sql.raw(stmt));
    }
    return NextResponse.json({
      success: true,
      message: "Migration ausgeführt (Becher, Lizenzen, Mandanten)",
      statements: STATEMENTS.length,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "Migrationsfehler", details: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
