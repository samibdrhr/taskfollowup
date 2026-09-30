"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { admin as identityAdmin } from "@netlify/identity";
import { db } from "@db/index";
import {
  comments,
  companySettings,
  messages,
  notifications,
  projectMembers,
  projects,
  subtasks,
  todoLists,
  todos,
  users,
  type User,
} from "@db/schema";
import { requireAdmin, requireManager, requireUser } from "@/lib/auth";
import { canWorkOnTodo, isManager, ROLES } from "@/lib/permissions";
import { assertProjectAccess } from "@/lib/projects";
import { findMentionedUserIds, notify } from "@/lib/notify";
import { displayName } from "@/lib/utils";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const int = (fd: FormData, key: string) => {
  const value = Number(fd.get(key));
  if (!Number.isInteger(value)) throw new Error(`Invalid ${key}.`);
  return value;
};
const optionalInt = (fd: FormData, key: string) => {
  const raw = str(fd, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) ? value : null;
};
const required = (value: string, label: string) => {
  if (!value) throw new Error(`${label} is required.`);
  return value;
};

async function loadTodo(user: User, todoId: number) {
  const [todo] = await db.select().from(todos).where(eq(todos.id, todoId));
  if (!todo) throw new Error("To-do not found.");
  await assertProjectAccess(user, todo.projectId);
  return todo;
}

const todoPath = (t: { projectId: number; id: number }) => `/projects/${t.projectId}/todos/${t.id}`;

async function touchTodo(todoId: number) {
  await db.update(todos).set({ lastActivityAt: new Date() }).where(eq(todos.id, todoId));
}

async function ensureMember(projectId: number, userId: number) {
  await db.insert(projectMembers).values({ projectId, userId }).onConflictDoNothing();
}

/* ---------- Projects ---------- */

export async function createProject(fd: FormData) {
  const user = await requireManager();
  const [project] = await db
    .insert(projects)
    .values({
      name: required(str(fd, "name"), "Project name"),
      description: str(fd, "description"),
      createdById: user.id,
    })
    .returning();
  await ensureMember(project.id, user.id);
  redirect(`/projects/${project.id}`);
}

export async function updateProject(fd: FormData) {
  await requireManager();
  const id = int(fd, "projectId");
  await db
    .update(projects)
    .set({ name: required(str(fd, "name"), "Project name"), description: str(fd, "description") })
    .where(eq(projects.id, id));
  revalidatePath(`/projects/${id}`);
}

export async function setProjectArchived(fd: FormData) {
  await requireManager();
  const id = int(fd, "projectId");
  await db
    .update(projects)
    .set({ archived: str(fd, "archived") === "true" })
    .where(eq(projects.id, id));
  revalidatePath("/");
  revalidatePath(`/projects/${id}`);
}

export async function addProjectMember(fd: FormData) {
  const user = await requireManager();
  const projectId = int(fd, "projectId");
  const userId = int(fd, "userId");
  await ensureMember(projectId, userId);
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  await notify({
    userIds: [userId],
    actorId: user.id,
    type: "assignment",
    text: `${displayName(user)} added you to ${project?.name ?? "a project"}`,
    link: `/projects/${projectId}`,
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function removeProjectMember(fd: FormData) {
  await requireManager();
  const projectId = int(fd, "projectId");
  await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, int(fd, "userId"))));
  revalidatePath(`/projects/${projectId}`);
}

/* ---------- Message board ---------- */

export async function createMessage(fd: FormData) {
  const user = await requireUser();
  const projectId = int(fd, "projectId");
  await assertProjectAccess(user, projectId);
  const title = required(str(fd, "title"), "Title");
  const body = str(fd, "body");
  const [message] = await db
    .insert(messages)
    .values({ projectId, authorId: user.id, title, body })
    .returning();
  const link = `/projects/${projectId}/messages/${message.id}`;
  const mentioned = await findMentionedUserIds(`${title}\n${body}`);
  await notify({
    userIds: mentioned,
    actorId: user.id,
    type: "mention",
    text: `${displayName(user)} mentioned you in “${title}”`,
    link,
  });
  redirect(link);
}

export async function toggleMessagePin(fd: FormData) {
  await requireManager();
  const id = int(fd, "messageId");
  const [message] = await db
    .update(messages)
    .set({ pinned: sql`not ${messages.pinned}` })
    .where(eq(messages.id, id))
    .returning();
  revalidatePath(`/projects/${message.projectId}`);
  revalidatePath(`/projects/${message.projectId}/messages/${id}`);
}

export async function deleteMessage(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "messageId");
  const [message] = await db.select().from(messages).where(eq(messages.id, id));
  if (!message) return;
  if (!isManager(user) && message.authorId !== user.id) {
    throw new Error("You can only delete your own messages.");
  }
  await db.delete(messages).where(eq(messages.id, id));
  redirect(`/projects/${message.projectId}?tab=messages`);
}

/* ---------- To-do lists & to-dos ---------- */

export async function createTodoList(fd: FormData) {
  await requireManager();
  const projectId = int(fd, "projectId");
  await db.insert(todoLists).values({
    projectId,
    name: required(str(fd, "name"), "List name"),
    description: str(fd, "description"),
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteTodoList(fd: FormData) {
  await requireManager();
  const [list] = await db.delete(todoLists).where(eq(todoLists.id, int(fd, "listId"))).returning();
  if (list) revalidatePath(`/projects/${list.projectId}`);
}

const todoFields = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string(),
  assigneeId: z.number().int().nullable(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  checkInDays: z.number().int().min(1).max(365).nullable(),
});

function parseTodoFields(fd: FormData) {
  return todoFields.parse({
    title: str(fd, "title"),
    description: str(fd, "description"),
    assigneeId: optionalInt(fd, "assigneeId"),
    dueDate: str(fd, "dueDate") || null,
    checkInDays: optionalInt(fd, "checkInDays"),
  });
}

async function notifyAssignee(actor: User, todo: { id: number; projectId: number; title: string }, assigneeId: number | null) {
  if (!assigneeId) return;
  await ensureMember(todo.projectId, assigneeId);
  await notify({
    userIds: [assigneeId],
    actorId: actor.id,
    type: "assignment",
    text: `${displayName(actor)} assigned you “${todo.title}”`,
    link: todoPath(todo),
  });
}

export async function createTodo(fd: FormData) {
  const user = await requireManager();
  const listId = int(fd, "listId");
  const [list] = await db.select().from(todoLists).where(eq(todoLists.id, listId));
  if (!list) throw new Error("List not found.");
  const fields = parseTodoFields(fd);
  const [todo] = await db
    .insert(todos)
    .values({ ...fields, listId, projectId: list.projectId, createdById: user.id })
    .returning();
  await notifyAssignee(user, todo, todo.assigneeId);
  revalidatePath(`/projects/${list.projectId}`);
}

export async function updateTodo(fd: FormData) {
  const user = await requireManager();
  const todo = await loadTodo(user, int(fd, "todoId"));
  const fields = parseTodoFields(fd);
  await db
    .update(todos)
    .set({ ...fields, lastActivityAt: new Date() })
    .where(eq(todos.id, todo.id));
  if (fields.assigneeId !== todo.assigneeId) {
    await notifyAssignee(user, { ...todo, title: fields.title }, fields.assigneeId);
  }
  revalidatePath(todoPath(todo));
}

export async function setTodoStatus(fd: FormData) {
  const user = await requireUser();
  const todo = await loadTodo(user, int(fd, "todoId"));
  if (!canWorkOnTodo(user, todo)) throw new Error("You can only update to-dos assigned to you.");
  const status = z.enum(["open", "in_progress", "done"]).parse(str(fd, "status"));
  await db
    .update(todos)
    .set({
      status,
      completedAt: status === "done" ? new Date() : null,
      lastActivityAt: new Date(),
    })
    .where(eq(todos.id, todo.id));
  if (status === "done" && todo.createdById) {
    await notify({
      userIds: [todo.createdById],
      actorId: user.id,
      type: "comment",
      text: `${displayName(user)} completed “${todo.title}”`,
      link: todoPath(todo),
    });
  }
  revalidatePath(`/projects/${todo.projectId}`);
  revalidatePath(todoPath(todo));
  revalidatePath("/");
}

export async function deleteTodo(fd: FormData) {
  const user = await requireManager();
  const todo = await loadTodo(user, int(fd, "todoId"));
  await db.delete(todos).where(eq(todos.id, todo.id));
  redirect(`/projects/${todo.projectId}`);
}

/* ---------- Subtasks ---------- */

export async function addSubtask(fd: FormData) {
  const user = await requireUser();
  const todo = await loadTodo(user, int(fd, "todoId"));
  if (!canWorkOnTodo(user, todo)) throw new Error("You can only update to-dos assigned to you.");
  await db.insert(subtasks).values({ todoId: todo.id, title: required(str(fd, "title"), "Subtask") });
  await touchTodo(todo.id);
  revalidatePath(todoPath(todo));
}

export async function toggleSubtask(fd: FormData) {
  const user = await requireUser();
  const [subtask] = await db.select().from(subtasks).where(eq(subtasks.id, int(fd, "subtaskId")));
  if (!subtask) return;
  const todo = await loadTodo(user, subtask.todoId);
  if (!canWorkOnTodo(user, todo)) throw new Error("You can only update to-dos assigned to you.");
  await db.update(subtasks).set({ done: !subtask.done }).where(eq(subtasks.id, subtask.id));
  await touchTodo(todo.id);
  revalidatePath(todoPath(todo));
}

export async function deleteSubtask(fd: FormData) {
  const user = await requireUser();
  const [subtask] = await db.select().from(subtasks).where(eq(subtasks.id, int(fd, "subtaskId")));
  if (!subtask) return;
  const todo = await loadTodo(user, subtask.todoId);
  if (!canWorkOnTodo(user, todo)) throw new Error("You can only update to-dos assigned to you.");
  await db.delete(subtasks).where(eq(subtasks.id, subtask.id));
  revalidatePath(todoPath(todo));
}

/* ---------- Comments ---------- */

export async function addComment(fd: FormData) {
  const user = await requireUser();
  const body = required(str(fd, "body"), "Comment");
  const todoId = optionalInt(fd, "todoId");
  const messageId = optionalInt(fd, "messageId");

  let link: string;
  let subject: string;
  let followers: number[];
  if (todoId) {
    const todo = await loadTodo(user, todoId);
    await db.insert(comments).values({ authorId: user.id, todoId, body });
    await touchTodo(todoId);
    link = todoPath(todo);
    subject = todo.title;
    followers = [todo.assigneeId, todo.createdById].filter((id): id is number => id !== null);
  } else if (messageId) {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!message) throw new Error("Message not found.");
    await assertProjectAccess(user, message.projectId);
    await db.insert(comments).values({ authorId: user.id, messageId, body });
    link = `/projects/${message.projectId}/messages/${message.id}`;
    subject = message.title;
    followers = message.authorId ? [message.authorId] : [];
  } else {
    throw new Error("Nothing to comment on.");
  }

  const previous = await db
    .selectDistinct({ authorId: comments.authorId })
    .from(comments)
    .where(todoId ? eq(comments.todoId, todoId) : eq(comments.messageId, messageId!));
  for (const p of previous) if (p.authorId) followers.push(p.authorId);

  const mentioned = await findMentionedUserIds(body);
  await notify({
    userIds: mentioned,
    actorId: user.id,
    type: "mention",
    text: `${displayName(user)} mentioned you on “${subject}”`,
    link,
  });
  await notify({
    userIds: followers.filter((id) => !mentioned.includes(id)),
    actorId: user.id,
    type: "comment",
    text: `${displayName(user)} commented on “${subject}”`,
    link,
  });
  revalidatePath(link);
}

/* ---------- Inbox ---------- */

export async function markNotificationRead(fd: FormData) {
  const user = await requireUser();
  const id = int(fd, "notificationId");
  const [n] = await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
    .returning();
  if (str(fd, "open") === "true" && n) redirect(n.link);
  revalidatePath("/inbox");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, user.id));
  revalidatePath("/", "layout");
}

/* ---------- People (admin) ---------- */

export async function addPerson(fd: FormData) {
  await requireAdmin();
  const email = z.string().email("Enter a valid email.").parse(str(fd, "email").toLowerCase());
  const name = str(fd, "name");
  const role = z.enum(ROLES as [string, ...string[]]).parse(str(fd, "role") || "employee");
  const password = str(fd, "password");

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) throw new Error("Someone with that email already exists.");

  let identityId: string | null = null;
  if (password) {
    if (password.length < 8) throw new Error("Temporary password must be at least 8 characters.");
    const created = await identityAdmin.createUser({
      email,
      password,
      data: { user_metadata: { full_name: name } },
    });
    identityId = created.id;
  }
  await db.insert(users).values({ email, name, role, identityId, title: str(fd, "title") });
  revalidatePath("/people");
}

export async function updatePersonRole(fd: FormData) {
  const me = await requireAdmin();
  const id = int(fd, "userId");
  const role = z.enum(ROLES as [string, ...string[]]).parse(str(fd, "role"));
  if (id === me.id && role !== "admin") throw new Error("You can't remove your own admin role.");
  await db.update(users).set({ role }).where(eq(users.id, id));
  revalidatePath("/people");
}

export async function setPersonActive(fd: FormData) {
  const me = await requireAdmin();
  const id = int(fd, "userId");
  if (id === me.id) throw new Error("You can't deactivate yourself.");
  await db.update(users).set({ active: str(fd, "active") === "true" }).where(eq(users.id, id));
  revalidatePath("/people");
}

/* ---------- Settings ---------- */

export async function updateProfile(fd: FormData) {
  const user = await requireUser();
  await db
    .update(users)
    .set({ name: str(fd, "name"), title: str(fd, "title") })
    .where(eq(users.id, user.id));
  revalidatePath("/", "layout");
}

export async function updateCompany(fd: FormData) {
  await requireAdmin();
  const name = required(str(fd, "companyName"), "Company name");
  await db
    .insert(companySettings)
    .values({ id: 1, name })
    .onConflictDoUpdate({ target: companySettings.id, set: { name, updatedAt: new Date() } });
  revalidatePath("/", "layout");
}

