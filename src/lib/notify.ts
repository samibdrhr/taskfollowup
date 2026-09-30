import { inArray } from "drizzle-orm";
import { db } from "@db/index";
import { notifications, users } from "@db/schema";
import { mentionHandle } from "./utils";

type NotificationInput = {
  userIds: number[];
  actorId: number | null;
  type: string;
  text: string;
  link: string;
};

/** Adds inbox notifications for each recipient, skipping the actor themself. */
export async function notify({ userIds, actorId, type, text, link }: NotificationInput) {
  const recipients = [...new Set(userIds)].filter((id) => id !== actorId);
  if (recipients.length === 0) return;
  await db
    .insert(notifications)
    .values(recipients.map((userId) => ({ userId, actorId, type, text, link })));
}

/** Finds users referenced as @handle (email local part) in a block of text. */
export async function findMentionedUserIds(body: string): Promise<number[]> {
  const handles = [...body.matchAll(/(?:^|[^\w@])@([a-zA-Z0-9._+-]+)/g)].map((m) =>
    m[1].toLowerCase().replace(/[.]+$/, ""),
  );
  if (handles.length === 0) return [];
  const all = await db.select({ id: users.id, email: users.email }).from(users);
  return all.filter((u) => handles.includes(mentionHandle(u.email))).map((u) => u.id);
}

export async function emailsFor(userIds: number[]) {
  if (userIds.length === 0) return [];
  return db.select().from(users).where(inArray(users.id, userIds));
}
