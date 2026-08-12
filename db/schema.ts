import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  time: text("event_time").notNull(),
  source: text("source").notNull(),
  event: text("event").notNull(),
  verdict: text("verdict", { enum: ["Allow", "Review", "Block"] }).notNull(),
  score: integer("score").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const approvals = sqliteTable("approvals", {
  id: text("id").primaryKey(),
  time: text("request_time").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  risk: integer("risk").notNull(),
  status: text("status", { enum: ["Pending", "Approved", "Denied"] }).notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
