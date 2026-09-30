import type { Role } from "@db/schema";

type Actor = { id: number; role: string };

export const ROLES: Role[] = ["admin", "manager", "employee"];

export const isAdmin = (u: Actor) => u.role === "admin";
export const isManager = (u: Actor) => u.role === "admin" || u.role === "manager";

/** Admins and managers can create and structure projects, lists, and to-dos. */
export const canManageProjects = isManager;
export const canManagePeople = isAdmin;
export const canEditCompany = isAdmin;

/** Managers can edit any to-do; employees can only work on to-dos assigned to them. */
export function canWorkOnTodo(u: Actor, todo: { assigneeId: number | null }) {
  return isManager(u) || todo.assigneeId === u.id;
}
