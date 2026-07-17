import { NextResponse } from "next/server";
import { pool } from "@/db";

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS "admins" (
  "id" serial PRIMARY KEY,
  "username" varchar(100) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sales_points" (
  "id" serial PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "drinks" (
  "id" serial PRIMARY KEY,
  "name" varchar(200) NOT NULL,
  "price_net" real NOT NULL,
  "tax_rate" real DEFAULT 19 NOT NULL,
  "has_deposit" boolean DEFAULT true NOT NULL,
  "deposit_amount" real DEFAULT 2.0 NOT NULL,
  "color" varchar(30) DEFAULT '#3B82F6' NOT NULL,
  "image_url" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_pour_drink" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Ensure column exists if table was created previously
ALTER TABLE "drinks" ADD COLUMN IF NOT EXISTS "is_pour_drink" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "orders" (
  "id" serial PRIMARY KEY,
  "sales_point_id" integer NOT NULL REFERENCES "sales_points"("id"),
  "total_gross" real NOT NULL,
  "total_deposit" real NOT NULL,
  "total_deposit_returned" real NOT NULL,
  "net_deposit" real NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" serial PRIMARY KEY,
  "order_id" integer NOT NULL REFERENCES "orders"("id"),
  "drink_id" integer NOT NULL REFERENCES "drinks"("id"),
  "drink_name" varchar(200) NOT NULL,
  "quantity" integer NOT NULL,
  "unit_price_gross" real NOT NULL,
  "unit_deposit" real NOT NULL,
  "total_price_gross" real NOT NULL,
  "total_deposit" real NOT NULL
);

CREATE TABLE IF NOT EXISTS "pour_queue" (
  "id" serial PRIMARY KEY,
  "sales_point_id" integer NOT NULL,
  "drink_name" varchar(200) NOT NULL,
  "pending_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "pour_stats" (
  "id" serial PRIMARY KEY,
  "drink_name" varchar(200) NOT NULL UNIQUE,
  "total_poured" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
`;

export async function GET() {
  try {
    await pool.query(MIGRATION_SQL);
    return NextResponse.json({
      success: true,
      message: "Datenbank-Tabellen und Spalten erfolgreich aktualisiert! (Spalte is_pour_drink und Zapf-Tabellen hinzugefügt)",
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration fehlgeschlagen", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}