import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const shops = pgTable("shops", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  presetType: text("preset_type").notNull().default("kirana"),
  defaultLanguage: text("default_language").notNull().default("hi"),
  gstMode: text("gst_mode").notNull().default("unregistered"),
  upiVpa: text("upi_vpa"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
