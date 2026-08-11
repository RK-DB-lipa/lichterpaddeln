import { pgTable, serial, text, integer, boolean, timestamp, real, varchar, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const managedUsers = pgTable("managed_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"), // null = never expires (Lipa permanent user)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Employee table - represents a real person
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Employee aliases - maps cashier names to employees
export const employeeAliases = pgTable("employee_aliases", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  aliasName: varchar("alias_name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesPoints = pgTable("sales_points", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  name: varchar("name", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const drinks = pgTable("drinks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  name: varchar("name", { length: 200 }).notNull(),
  priceNet: real("price_net"), // Jetzt optional (war früher NOT NULL)
  priceGross: real("price_gross").notNull(),
  taxRate: real("tax_rate").notNull().default(19),
  hasDeposit: boolean("has_deposit").notNull().default(true),
  depositAmount: real("deposit_amount").notNull().default(2.0),
  cupSize: varchar("cup_size", { length: 10 }).notNull().default("04"),
  color: varchar("color", { length: 30 }).notNull().default("#3B82F6"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  isPourDrink: boolean("is_pour_drink").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  group: varchar("group_name", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Junction table: which drinks are available at which sales points
export const drinkSalesPoints = pgTable("drink_sales_points", {
  drinkId: integer("drink_id").notNull().references(() => drinks.id),
  salesPointId: integer("sales_point_id").notNull().references(() => salesPoints.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.drinkId, t.salesPointId] }),
}));

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  salesPointId: integer("sales_point_id").notNull().references(() => salesPoints.id),
  totalGross: real("total_gross").notNull(),
  totalDeposit: real("total_deposit").notNull(),
  totalDepositReturned: real("total_deposit_returned").notNull(),
  netDeposit: real("net_deposit").notNull(),
  cashierName: varchar("cashier_name", { length: 200 }).default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  drinkId: integer("drink_id").notNull().references(() => drinks.id),
  drinkName: varchar("drink_name", { length: 200 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceGross: real("unit_price_gross").notNull(),
  unitDeposit: real("unit_deposit").notNull(),
  totalPriceGross: real("total_price_gross").notNull(),
  totalDeposit: real("total_deposit").notNull(),
});

export const pourQueue = pgTable("pour_queue", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  salesPointId: integer("sales_point_id").notNull(),
  drinkName: varchar("drink_name", { length: 200 }).notNull(),
  pendingCount: integer("pending_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pourStats = pgTable("pour_stats", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  salesPointId: integer("sales_point_id").notNull().default(0),
  drinkName: varchar("drink_name", { length: 200 }).notNull(),
  pourerName: varchar("pourer_name", { length: 200 }).default(""),
  totalPoured: integer("total_poured").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cupCounters = pgTable("cup_counters", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  salesPointId: integer("sales_point_id").notNull(),
  size: varchar("size", { length: 10 }).notNull(),
  given: integer("given").notNull().default(0),
  returned: integer("returned").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Food items (meals, snacks, etc.)
export const foods = pgTable("foods", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  name: varchar("name", { length: 200 }).notNull(),
  priceGross: real("price_gross").notNull(),
  taxRate: real("tax_rate").notNull().default(19),
  color: varchar("color", { length: 30 }).notNull().default("#10B981"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  isCookItem: boolean("is_cook_item").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  group: varchar("group_name", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Events (multi-day events with date ranges)
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  name: varchar("name", { length: 200 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Event-Drinks assignment (which drinks are available for which event)
export const eventDrinks = pgTable("event_drinks", {
  eventId: integer("event_id").notNull().references(() => events.id),
  drinkId: integer("drink_id").notNull().references(() => drinks.id),
});

// Event-Food assignment (which foods are available for which event)
export const eventFoods = pgTable("event_foods", {
  eventId: integer("event_id").notNull().references(() => events.id),
  foodId: integer("food_id").notNull().references(() => foods.id),
});

// Food queue: pending food orders for the kitchen
export const foodQueue = pgTable("food_queue", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  foodName: varchar("food_name", { length: 200 }).notNull(),
  quantity: integer("quantity").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Food stats: total cooked food items
export const foodStats = pgTable("food_stats", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().default(0),
  foodName: varchar("food_name", { length: 200 }).notNull(),
  totalCooked: integer("total_cooked").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Food order items (individual food items within an order)
export const orderFoodItems = pgTable("order_food_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  foodId: integer("food_id").notNull().references(() => foods.id),
  foodName: varchar("food_name", { length: 200 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceGross: real("unit_price_gross").notNull(),
  totalPriceGross: real("total_price_gross").notNull(),
});

export type DrinkSummary = { drinkId: number; drinkName: string; totalQuantity: number; totalGross: number; totalDeposit: number; };
