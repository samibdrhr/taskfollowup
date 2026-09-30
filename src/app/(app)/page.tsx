import Link from "next/link";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@db/index";
import { projects, todos } from "@db/schema";
import { createProject } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { canManageProjects } from "@/lib/permissions";
import { listProjects } from "@/lib/projects";
import { DueDate, EmptyState, PageHeader, ProgressPie, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { displayName } from "@/lib/utils";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const user = await requireUser();
  const showArchived = (await searchParams).archived === "1";
  const visible = await listProjects(user, { archived: showArchived });

  const [progress, mine] = await Promise.all([
    visible.length
      ? db
          .select({
            projectId: todos.projectId,
            total: sql<number>`count(*)::int`,
            done: sql<number>`count(*) filter (where ${todos.status} = 'done')::int`,
          })
          .from(todos)
          .where(
            inArray(
              todos.projectId,
              visible.map((p) => p.id),
            ),
          )
          .groupBy(todos.projectId)
      : [],
    db
      .select({ todo: todos, projectName: projects.name })
      .from(todos)
      .innerJoin(projects, eq(todos.projectId, projects.id))
      .where(and(eq(todos.assigneeId, user.id), ne(todos.status, "done"), eq(projects.archived, false)))
      .orderBy(sql`${todos.dueDate} asc nulls last`, asc(todos.createdAt))
      .limit(25),
  ]);
  const progressById = new Map(progress.map((p) => [p.projectId, p]));
  const firstName = displayName(user).split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Hi, ${firstName}`}
        subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      />

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold">Assigned to me</h2>
        {mine.length === 0 ? (
          <EmptyState>You&apos;re all caught up. Nothing open is assigned to you.</EmptyState>
        ) : (
          <ul className="card divide-y">
            {mine.map(({ todo, projectName }) => (
              <li key={todo.id}>
                <Link
                  href={`/projects/${todo.projectId}/todos/${todo.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-secondary/50"
                >
                  <span className="min-w-0 flex-1 font-medium">{todo.title}</span>
                  <span className="text-xs text-muted-foreground">{projectName}</span>
                  <DueDate date={todo.dueDate} status={todo.status} />
                  <StatusBadge status={todo.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{showArchived ? "Archived projects" : "Projects"}</h2>
          <Link href={showArchived ? "/" : "/?archived=1"} className="text-sm text-muted-foreground hover:text-foreground">
            {showArchived ? "← Active projects" : "View archived"}
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => {
            const p = progressById.get(project.id);
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold group-hover:text-primary">{project.name}</h3>
                  <ProgressPie done={p?.done ?? 0} total={p?.total ?? 0} size={36} />
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {project.description || "No description yet."}
                </p>
                <p className="mt-auto text-xs text-muted-foreground">
                  {p ? `${p.done} of ${p.total} to-dos done` : "No to-dos yet"}
                </p>
              </Link>
            );
          })}

          {!showArchived && canManageProjects(user) && (
            <form action={createProject} className="card flex flex-col gap-3 border-dashed bg-transparent p-5">
              <h3 className="font-bold">New project</h3>
              <input name="name" className="input" placeholder="Project name" required />
              <textarea name="description" className="input" rows={2} placeholder="What's it about?" />
              <SubmitButton pendingText="Creating…">Create project</SubmitButton>
            </form>
          )}
        </div>

        {visible.length === 0 && !canManageProjects(user) && (
          <EmptyState>You haven&apos;t been added to any projects yet.</EmptyState>
        )}
      </section>
    </>
  );
}
