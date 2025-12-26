import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  image: text("image").default(""),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Groups table
export const groupsTable = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  isPrivate: boolean("is_private").default(false),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Group Members table
export const groupMembersTable = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groupsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").default("member"), // 'admin' or 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Messages table (for both group and direct messages)
export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groupsTable.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  receiverId: uuid("receiver_id")
    .references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // 'text', 'image', 'file'
  createdAt: timestamp("created_at").defaultNow(),
  isEdited: boolean("is_edited").default(false),
  isRead: boolean("is_read").default(false),
});

// User Contacts table (for "Add for chat" feature)
// This tracks users that have been explicitly added for chatting
export const userContactsTable = pgTable("user_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  contactUserId: uuid("contact_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  addedForChat: boolean("added_for_chat").default(true), // true = added as contact, false = removed
  addedAt: timestamp("added_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdGroups: many(groupsTable),
  groupMemberships: many(groupMembersTable),
  sentMessages: many(messagesTable),
}));

export const groupsRelations = relations(groupsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [groupsTable.createdBy],
    references: [usersTable.id],
  }),
  members: many(groupMembersTable),
  messages: many(messagesTable),
}));

export const groupMembersRelations = relations(
  groupMembersTable,
  ({ one }) => ({
    group: one(groupsTable, {
      fields: [groupMembersTable.groupId],
      references: [groupsTable.id],
    }),
    user: one(usersTable, {
      fields: [groupMembersTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  group: one(groupsTable, {
    fields: [messagesTable.groupId],
    references: [groupsTable.id],
  }),
  sender: one(usersTable, {
    fields: [messagesTable.senderId],
    references: [usersTable.id],
  }),
  receiver: one(usersTable, {
    fields: [messagesTable.receiverId],
    references: [usersTable.id],
  }),
}));

// User Contacts relations
export const userContactsRelations = relations(userContactsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userContactsTable.userId],
    references: [usersTable.id],
  }),
  contactUser: one(usersTable, {
    fields: [userContactsTable.contactUserId],
    references: [usersTable.id],
  }),
}));