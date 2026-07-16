import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  real,
  varchar,
} from "drizzle-orm/pg-core";

// Admin users for backend management
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sales points (up to 5)
export const salesPoints = pgTable("sales_points", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Drinks configuration
export const drinks = pgTable("drinks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  priceNet: real("price_net").notNull(), // Net price in EUR
  taxRate: real("tax_rate").notNull().default(19), // 7 or 19
  hasDeposit: boolean("has_deposit").notNull().default(true), // 2€ Pfand optional
  depositAmount: real("deposit_amount").notNull().default(2.0), // deposit per cup
  color: varchar("color", { length: 30 }).notNull().default("#3B82F6"), // button background color
  imageUrl: text("image_url"), // optional drink image
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Completed orders (one row per checkout/reset)
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  salesPointId: integer("sales_point_id")
    .notNull()
    .references(() => salesPoints.id),
  totalGross: real("total_gross").notNull(), // total gross amount
  totalDeposit: real("total_deposit").notNull(), // total deposit charged
  totalDepositReturned: real("total_deposit_returned").notNull(), // deposit returned
  netDeposit: real("net_deposit").notNull(), // deposit charged minus returned
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Individual items within an order
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  drinkId: integer("drink_id")
    .notNull()
    .references(() => drinks.id),
  drinkName: varchar("drink_name", { length: 200 }).notNull(), // denormalized for history
  quantity: integer("quantity").notNull(),
  unitPriceGross: real("unit_price_gross").notNull(),
  unitDeposit: real("unit_deposit").notNull(),
  totalPriceGross: real("total_price_gross").notNull(),
  totalDeposit: real("total_deposit").notNull(),
});

// Event summary view helper type
export type DrinkSummary = {
  drinkId: number;
  drinkName: string;
  totalQuantity: number;
  totalGross: number;
  totalDeposit: number;
};
