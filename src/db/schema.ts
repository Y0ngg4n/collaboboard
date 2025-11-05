import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const whiteboards = sqliteTable("whiteboards", {
  id: text("id").primaryKey(),
  encryptedData: text("encrypted_data").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
