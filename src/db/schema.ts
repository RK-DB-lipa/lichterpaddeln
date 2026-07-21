import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  real,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Super admins (app owner). Super admin data lives in tenant 0.
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Licensed users (tenants) created by the super admin
export const managedUsers = pgTable("managed_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sales points (unlimited) – tenantId 0 = super admin namespace
export const salesPoints = pgTable("sales_points", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  name: varchar("name", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Drinks configuration
export const drinks = pgTable("drinks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  name: varchar("name", { length: 200 }).notNull(),
  priceNet: real("price_net").notNull(),
  taxRate: real("tax_rate").notNull().default(19),
  hasDeposit: boolean("has_deposit").notNull().default(true),
  depositAmount: real("deposit_amount").notNull().default(2.0),
  cupSize: varchar("cup_size", { length: 10 }).notNull().default("04"),
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
  tenantId: integer("tenant_id").notNull().default(0),
  salesPointId: integer("sales_point_id")
    .notNull()
    .references(() => salesPoints.id),
  totalGross: real("total_gross").notNull(),
  totalDeposit: real("total_deposit").notNull(),
  totalDepositReturned: real("total_deposit_returned").notNull(),
  netDeposit: real("net_deposit").notNull(),
  cashierName: varchar("cashier_name", { length: 200 }).default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Individual items within an order (scoped via orders.tenantId)
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
  tenantId: integer("tenant_id").notNull().default(0),
  salesPointId: integer("sales_point_id").notNull(),
  drinkName: varchar("drink_name", { length: 200 }).notNull(),
  pendingCount: integer("pending_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Pour stats: total poured drinks (per tenant)
export const pourStats = pgTable("pour_stats", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  drinkName: varchar("drink_name", { length: 200 }).notNull(),
  totalPoured: integer("total_poured").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("pour_stats_tenant_drink_unique").on(t.tenantId, t.drinkName),
]);

// Cup counters: deposit cups out / back, per sales point & size
export const cupCounters = pgTable("cup_counters", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  salesPointId: integer("sales_point_id").notNull(),
  size: varchar("size", { length: 10 }).notNull(), // "02" | "04"
  given: integer("given").notNull().default(0),
  returned: integer("returned").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("cup_counters_unique").on(t.tenantId, t.salesPointId, t.size),
]);

export type DrinkSummary = {
  drinkId: number;
  drinkName: string;
  totalQuantity: number;
  totalGross: number;
  totalDeposit: number;
};
