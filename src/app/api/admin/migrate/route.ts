import { NextResponse } from "next/server";
import { pool } from "@/db";

const CREATE_TABLES_SQL = `
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
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

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
`;

export async function GET() {
  try {
    await pool.query(CREATE_TABLES_SQL);
    return NextResponse.json({
      success: true,
      message: "Tabellen erfolgreich erstellt",
      nextStep: "Rufe jetzt /api/admin/setup auf, um Admin und Standard-Daten anzulegen",
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