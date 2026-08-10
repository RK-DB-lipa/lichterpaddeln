import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

const STATEMENTS = [
  // --- Bestehende Migrationen (idempotent, falls noch nicht gelaufen) ---
  `ALTER TABLE sales_points ADD COLUMN IF NOT EXISTS tenant_id integer NOT NULL DEFAULT 0`,
  `ALTER TABLE drinks ADD COLUMN IF NOT EXISTS tenant_id integer NOT NULL DEFAULT 0`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id integer NOT NULL DEFAULT 0`,
  `ALTER TABLE pour_queue ADD COLUMN IF NOT EXISTS tenant_id integer NOT NULL DEFAULT 0`,
  `ALTER TABLE pour_stats ADD COLUMN IF NOT EXISTS tenant_id integer NOT NULL DEFAULT 0`,
  `ALTER TABLE drinks ADD COLUMN IF NOT EXISTS cup_size varchar(10) NOT NULL DEFAULT '04'`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_name varchar(200) DEFAULT ''`,

  `CREATE TABLE IF NOT EXISTS managed_users (
    id serial PRIMARY KEY, username varchar(100) NOT NULL UNIQUE,
    password_hash text NOT NULL, is_active boolean NOT NULL DEFAULT true,
    expires_at timestamp NOT NULL, created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS cup_counters (
    id serial PRIMARY KEY, tenant_id integer NOT NULL DEFAULT 0,
    sales_point_id integer NOT NULL, size varchar(10) NOT NULL,
    given integer NOT NULL DEFAULT 0, created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS cup_counters_unique ON cup_counters (tenant_id, sales_point_id, size)`,
  `ALTER TABLE cup_counters ADD COLUMN IF NOT EXISTS returned integer NOT NULL DEFAULT 0`,

  // --- NEU: Bruttopreis statt Nettopreis ---
  // --- NEU: Getränke-Gruppen + expiresAt nullable für Lipa-User ---
  `ALTER TABLE drinks ADD COLUMN IF NOT EXISTS group_name varchar(100)`,
  `ALTER TABLE managed_users ALTER COLUMN expires_at DROP NOT NULL`,

  // Bruttopreis hinzufügen und berechnen
  `ALTER TABLE drinks ADD COLUMN IF NOT EXISTS price_gross real`,
  `UPDATE drinks SET price_gross = price_net * (1 + tax_rate / 100) WHERE price_gross IS NULL AND price_net IS NOT NULL`,
  `ALTER TABLE drinks ALTER COLUMN price_gross SET NOT NULL`,
  `ALTER TABLE drinks ALTER COLUMN price_gross SET DEFAULT 0`,
  // Alten Nettopreis entfernen (war NOT NULL, jetzt nicht mehr benötigt)
  `ALTER TABLE drinks ALTER COLUMN price_net DROP NOT NULL`,

  // --- NEU: Food, Events und Zuordnungen ---
  `CREATE TABLE IF NOT EXISTS foods (
    id serial PRIMARY KEY,
    tenant_id integer NOT NULL DEFAULT 0,
    name varchar(200) NOT NULL,
    price_gross real NOT NULL,
    tax_rate real NOT NULL DEFAULT 19,
    color varchar(30) NOT NULL DEFAULT '#10B981',
    image_url text,
    is_active boolean NOT NULL DEFAULT true,
    is_cook_item boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    group_name varchar(100),
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id serial PRIMARY KEY,
    tenant_id integer NOT NULL DEFAULT 0,
    name varchar(200) NOT NULL,
    start_date timestamp NOT NULL,
    end_date timestamp NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS event_drinks (
    event_id integer NOT NULL REFERENCES events(id),
    drink_id integer NOT NULL REFERENCES drinks(id),
    PRIMARY KEY (event_id, drink_id)
  )`,
  `CREATE TABLE IF NOT EXISTS event_foods (
    event_id integer NOT NULL REFERENCES events(id),
    food_id integer NOT NULL REFERENCES foods(id),
    PRIMARY KEY (event_id, food_id)
  )`,
  `CREATE TABLE IF NOT EXISTS food_queue (
    id serial PRIMARY KEY,
    tenant_id integer NOT NULL DEFAULT 0,
    food_name varchar(200) NOT NULL,
    quantity integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS food_stats (
    id serial PRIMARY KEY,
    tenant_id integer NOT NULL DEFAULT 0,
    food_name varchar(200) NOT NULL,
    total_cooked integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS order_food_items (
    id serial PRIMARY KEY,
    order_id integer NOT NULL REFERENCES orders(id),
    food_id integer NOT NULL REFERENCES foods(id),
    food_name varchar(200) NOT NULL,
    quantity integer NOT NULL,
    unit_price_gross real NOT NULL,
    total_price_gross real NOT NULL
  )`,

  // --- NEU: Getränke-Verkaufsstellen Zuordnung ---
  `CREATE TABLE IF NOT EXISTS drink_sales_points (
    drink_id integer NOT NULL REFERENCES drinks(id),
    sales_point_id integer NOT NULL REFERENCES sales_points(id),
    PRIMARY KEY (drink_id, sales_point_id)
  )`,

  // --- NEU: pour_stats um sales_point_id + pourer_name erweitern ---
  `ALTER TABLE pour_stats ADD COLUMN IF NOT EXISTS sales_point_id integer NOT NULL DEFAULT 0`,
  `ALTER TABLE pour_stats ADD COLUMN IF NOT EXISTS pourer_name varchar(200) DEFAULT ''`,
  `DROP INDEX IF EXISTS pour_stats_tenant_drink_unique`,

  // --- NEU: Index für pourer_name-Suche ---
  `CREATE INDEX IF NOT EXISTS pour_stats_tenant_sp_drink_idx ON pour_stats (tenant_id, sales_point_id, drink_name)`,
  `CREATE INDEX IF NOT EXISTS orders_cashier_name_idx ON orders (tenant_id, cashier_name)`,
];

export async function POST() {
  try {
    for (const stmt of STATEMENTS) { await db.execute(sql.raw(stmt)); }
    return NextResponse.json({ success: true, message: "Migration ausgeführt (Brutto, Getr-SP, Pourer)", statements: STATEMENTS.length });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "Migrationsfehler", details: String(error) }, { status: 500 });
  }
}
export async function GET() { return POST(); }
