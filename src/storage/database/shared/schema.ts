import { pgTable, varchar, text, timestamp, jsonb, index, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

/* ============ 笔记（数字花园） ============ */
export const notes = pgTable(
  "notes",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 200 }).notNull(),
    summary: varchar("summary", { length: 300 }).notNull().default(""),
    content: text("content").notNull().default(""),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    published_at: timestamp("published_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("notes_status_published_idx").on(table.status, table.published_at),
    index("notes_status_idx").on(table.status),
  ]
);

/* ============ 标签 ============ */
export const tags = pgTable("tags", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ============ 笔记-标签关联 ============ */
export const noteTags = pgTable(
  "note_tags",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    note_id: varchar("note_id", { length: 36 })
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    tag_id: varchar("tag_id", { length: 36 })
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("note_tags_note_id_idx").on(table.note_id),
    index("note_tags_tag_id_idx").on(table.tag_id),
  ]
);

/* ============ 作品集 ============ */
export const works = pgTable(
  "works",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 200 }).notNull(),
    subtitle: varchar("subtitle", { length: 300 }).notNull().default(""),
    cover_url: text("cover_url"),
    content: text("content").notNull().default(""),
    external_url: text("external_url"),
    tags: jsonb("tags").$type<string[]>().default([]),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("works_created_at_idx").on(table.created_at)]
);

/* ============ 站长档案（关于我，单行） ============ */
export const profile = pgTable("profile", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  nickname: varchar("nickname", { length: 50 }).notNull().default("枫"),
  headline: varchar("headline", { length: 200 }).notNull().default(""),
  bio: text("bio").notNull().default(""),
  avatar_url: text("avatar_url"),
  skills: jsonb("skills").$type<string[]>().default([]),
  contact: jsonb("contact")
    .$type<{ label: string; value: string; icon: string }[]>()
    .default([]),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ============ 留言（数字花园留言板） ============ */
export const messages = pgTable(
  "messages",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 50 }).notNull(),
    content: text("content").notNull(),
    visitor_token: varchar("visitor_token", { length: 64 }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("messages_visitor_token_idx").on(table.visitor_token),
    index("messages_created_at_idx").on(table.created_at),
    index("messages_deleted_at_idx").on(table.deleted_at),
  ]
);
