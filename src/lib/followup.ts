import { and, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "../../db/index";
import { notifications, projects, todos, users } from "../../db/schema";
import { sendEmail } from "./email";

const DAY = 24 * 60 * 60 * 1000;

type Reason = "overdue" | "due_soon" | "check_in";

/**
 * Finds open to-dos that are overdue, due tomorrow, or have gone quiet for longer
 * than their check-in interval, and nudges the assignee (inbox + email).
 * Each to-do is reminded at most once per day (or once per check-in interval).
 */
export async function runFollowUps(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + DAY).toISOString().slice(0, 10);
  const siteUrl = process.env.URL ?? "";

  const open = await db
    .select({ todo: todos, assignee: users, projectName: projects.name })
    .from(todos)
    .innerJoin(users, eq(todos.assigneeId, users.id))
    .innerJoin(projects, eq(todos.projectId, projects.id))
    .where(and(ne(todos.status, "done"), isNotNull(todos.assigneeId), eq(projects.archived, false)));

  let sent = 0;
  for (const { todo, assignee, projectName } of open) {
    if (!assignee.active) continue;
    const lastReminder = todo.lastReminderAt?.getTime() ?? 0;
    const sinceReminder = now.getTime() - lastReminder;

    let reason: Reason | null = null;
    if (todo.dueDate && todo.dueDate < today && sinceReminder > DAY) {
      reason = "overdue";
    } else if (todo.dueDate === tomorrow && sinceReminder > DAY) {
      reason = "due_soon";
    } else if (todo.checkInDays) {
      const interval = todo.checkInDays * DAY;
      const quietFor = now.getTime() - todo.lastActivityAt.getTime();
      if (quietFor > interval && sinceReminder > interval) reason = "check_in";
    }
    if (!reason) continue;

    const link = `/projects/${todo.projectId}/todos/${todo.id}`;
    const text =
      reason === "overdue"
        ? `“${todo.title}” was due ${todo.dueDate} and is overdue`
        : reason === "due_soon"
          ? `“${todo.title}” is due tomorrow`
          : `Check-in: any progress on “${todo.title}”? No updates in ${todo.checkInDays} day(s)`;

    const recipients = [assignee.id];
    if (reason !== "due_soon" && todo.createdById && todo.createdById !== assignee.id) {
      recipients.push(todo.createdById);
    }
    await db.insert(notifications).values(
      recipients.map((userId) => ({
        userId,
        actorId: null,
        type: reason === "check_in" ? "check_in" : reason === "overdue" ? "overdue" : "reminder",
        text: userId === assignee.id ? text : `${assignee.name || assignee.email}: ${text}`,
        link,
      })),
    );
    await sendEmail(
      assignee.email,
      `[${projectName}] ${text.replace(/[“”]/g, '"')}`,
      `${text}.\n\nOpen the to-do: ${siteUrl}${link}\n`,
    );
    await db.update(todos).set({ lastReminderAt: now }).where(eq(todos.id, todo.id));
    sent++;
  }
  return { checked: open.length, reminded: sent };
}
