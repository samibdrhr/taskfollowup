import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  date,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial().primaryKey(),
  identityId: text("identity_id").unique(),
  email: text().notNull().unique(),
  name: text().notNull().default(""),
  title: text().notNull().default(""),
  role: text().notNull().default("employee"), // admin | manager | employee
  active: boolean().notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companySettings = pgTable("company_settings", {
  id: integer().primaryKey(),
  name: text().notNull().default("Our Company"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial().primaryKey(),
  name: text().notNull(),
  description: text().notNull().default(""),
  createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
  archived: boolean().notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

export const messages = pgTable(
  "messages",
  {
    id: serial().primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
    title: text().notNull(),
    body: text().notNull().default(""),
    pinned: boolean().notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("messages_project_idx").on(t.projectId)],
);

export const todoLists = pgTable(
  "todo_lists",
  {
    id: serial().primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text().notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("todo_lists_project_idx").on(t.projectId)],
);

export const todos = pgTable(
  "todos",
  {
    id: serial().primaryKey(),
    listId: integer("list_id")
      .notNull()
      .references(() => todoLists.id, { onDelete: "cascade" }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text().notNull().default(""),
    assigneeId: integer("assignee_id").references(() => users.id, { onDelete: "set null" }),
    createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
    dueDate: date("due_date"),
    status: text().notNull().default("open"), // open | in_progress | done
    checkInDays: integer("check_in_days"),
    lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
    lastReminderAt: timestamp("last_reminder_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("todos_list_idx").on(t.listId),
    index("todos_assignee_idx").on(t.assigneeId),
  ],
);

export const subtasks = pgTable(
  "subtasks",
  {
    id: serial().primaryKey(),
    todoId: integer("todo_id")
      .notNull()
      .references(() => todos.id, { onDelete: "cascade" }),
    title: text().notNull(),
    done: boolean().notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("subtasks_todo_idx").on(t.todoId)],
);

export const comments = pgTable(
  "comments",
  {
    id: serial().primaryKey(),
    authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
    todoId: integer("todo_id").references(() => todos.id, { onDelete: "cascade" }),
    messageId: integer("message_id").references(() => messages.id, { onDelete: "cascade" }),
    body: text().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("comments_todo_idx").on(t.todoId),
    index("comments_message_idx").on(t.messageId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial().primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
    type: text().notNull(), // assignment | mention | comment | reminder | overdue | check_in
    text: text().notNull(),
    link: text().notNull().default("/"),
    read: boolean().notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.read)],
);

export type User = typeof users.$inferSelect;
export type Role = "admin" | "manager" | "employee";
