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

// Sales points (unlimited)
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
  priceNet: real("price_net").notNull(),
  taxRate: real("tax_rate").notNull().default(19),
  hasDeposit: boolean("has_deposit").notNull().default(true),
  depositAmount: real("deposit_amount").notNull().default(2.0),
  color: varchar("color", { length: 30 }).notNull().default("#3B82F6"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  isPourDrink: boolean("is_pour_drink").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Completed orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  salesPointId: integer("sales_point_id")
    .notNull()
    .references(() => salesPoints.id),
  totalGross: real("total_gross").notNull(),
  totalDeposit: real("total_deposit").notNull(),
  totalDepositReturned: real("total_deposit_returned").notNull(),
  netDeposit: real("net_deposit").notNull(),
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
  drinkName: varchar("drink_name", { length: 200 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceGross: real("unit_price_gross").notNull(),
  unitDeposit: real("unit_deposit").notNull(),
  totalPriceGross: real("total_price_gross").notNull(),
  totalDeposit: real("total_deposit").notNull(),
});

// Pour queue: pending drinks to pour per sales point
export const pourQueue = pgTable("pour_queue", {
  id: serial("id").primaryKey(),
  salesPointId: integer("sales_point_id").notNull(),
  drinkName: varchar("drink_name", { length: 200 }).notNull(),
  pendingCount: integer("pending_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Pour stats: total poured drinks (event-wide)
export const pourStats = pgTable("pour_stats", {
  id: serial("id").primaryKey(),
  drinkName: varchar("drink_name", { length: 200 }).notNull().unique(),
  totalPoured: integer("total_poured").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DrinkSummary = {
  drinkId: number;
  drinkName: string;
  totalQuantity: number;
  totalGross: number;
  totalDeposit: number;
};
