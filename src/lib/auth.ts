import { getUser } from "@netlify/identity";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@db/index";
import { users, type User } from "@db/schema";
import { isAdmin, isManager } from "./permissions";

/**
 * Resolves the signed-in Netlify Identity user to an app user record.
 * New identities are linked to a pre-created record with the same email
 * (added by an admin on the People page) or provisioned as employees.
 * The very first person to sign in becomes the admin.
 */
export async function getCurrentUser(): Promise<User | null> {
  const identity = await getUser();
  if (!identity?.email) return null;
  const email = identity.email.toLowerCase();

  const [byIdentity] = await db.select().from(users).where(eq(users.identityId, identity.id));
  if (byIdentity) return byIdentity.active ? byIdentity : null;

  const [byEmail] = await db.select().from(users).where(eq(users.email, email));
  if (byEmail) {
    const [linked] = await db
      .update(users)
      .set({ identityId: identity.id, name: byEmail.name || identity.name || "" })
      .where(eq(users.id, byEmail.id))
      .returning();
    return linked.active ? linked : null;
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [created] = await db
    .insert(users)
    .values({
      identityId: identity.id,
      email,
      name: identity.name ?? "",
      role: count === 0 ? "admin" : "employee",
    })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  return existing ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireManager(): Promise<User> {
  const user = await requireUser();
  if (!isManager(user)) throw new Error("Only admins and managers can do that.");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isAdmin(user)) throw new Error("Only admins can do that.");
  return user;
}
