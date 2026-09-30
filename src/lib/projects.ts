import { notFound } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@db/index";
import { projectMembers, projects, type User } from "@db/schema";
import { isManager } from "./permissions";

/** Admins and managers see every project; employees see projects they belong to. */
export async function listProjects(user: User, { archived = false } = {}) {
  if (isManager(user)) {
    return db
      .select()
      .from(projects)
      .where(eq(projects.archived, archived))
      .orderBy(desc(projects.createdAt));
  }
  const memberships = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, user.id));
  const ids = memberships.map((m) => m.projectId);
  if (ids.length === 0) return [];
  return db
    .select()
    .from(projects)
    .where(and(inArray(projects.id, ids), eq(projects.archived, archived)))
    .orderBy(desc(projects.createdAt));
}

export async function canAccessProject(user: User, projectId: number) {
  if (isManager(user)) return true;
  const [membership] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)));
  return Boolean(membership);
}

export async function getProjectForUser(user: User, projectId: number) {
  if (!Number.isInteger(projectId)) notFound();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || !(await canAccessProject(user, projectId))) notFound();
  return project;
}

export async function assertProjectAccess(user: User, projectId: number) {
  if (!(await canAccessProject(user, projectId))) {
    throw new Error("You don't have access to this project.");
  }
}

export async function projectMemberIds(projectId: number) {
  const rows = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId));
  return rows.map((r) => r.userId);
}
