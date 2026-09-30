import Link from "next/link";
import { cn, initials } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-emerald-700",
  "bg-amber-600",
  "bg-sky-700",
  "bg-rose-600",
  "bg-violet-700",
  "bg-teal-600",
  "bg-orange-700",
];

export function Avatar({
  user,
  size = "md",
}: {
  user: { id: number; name: string; email: string } | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "h-6 w-6 text-[10px]", md: "h-8 w-8 text-xs", lg: "h-12 w-12 text-base" };
  if (!user) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground",
          sizes[size],
        )}
        title="Unassigned"
      >
        ?
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        AVATAR_COLORS[user.id % AVATAR_COLORS.length],
        sizes[size],
      )}
      title={user.name || user.email}
    >
      {initials(user.name, user.email)}
    </span>
  );
}

/** Small donut showing how many to-dos in a list are complete. */
export function ProgressPie({ done, total, size = 40 }: { done: number; total: number; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : done / total;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${done} of ${total} complete`}
      className="shrink-0"
    >
      <title>{`${done} of ${total} complete`}</title>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={6} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={6}
        strokeDasharray={`${pct * c} ${c}`}
        strokeLinecap={pct > 0 && pct < 1 ? "round" : "butt"}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-secondary text-secondary-foreground",
  in_progress: "bg-amber-100 text-amber-900",
  done: "bg-emerald-100 text-emerald-900",
};
export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLES[status])}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function DueDate({ date, status }: { date: string | null; status: string }) {
  if (!date) return null;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = status !== "done" && date < today;
  const label = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return (
    <span
      className={cn(
        "whitespace-nowrap text-xs",
        overdue ? "font-semibold text-destructive" : "text-muted-foreground",
      )}
    >
      {overdue ? "Overdue · " : "Due "}
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-foreground text-background",
    manager: "bg-primary/10 text-primary",
    employee: "bg-secondary text-secondary-foreground",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", styles[role])}>
      {role}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      {back && (
        <Link href={back.href} className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
          {subtitle && <div className="mt-1 text-muted-foreground">{subtitle}</div>}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Renders text with @mentions highlighted and line breaks preserved. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/((?:^|(?<=[^\w@]))@[a-zA-Z0-9._+-]+)/g);
  return (
    <div className={cn("whitespace-pre-wrap break-words leading-relaxed", className)}>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="rounded bg-accent/15 px-0.5 font-semibold text-amber-900">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </div>
  );
}

export function timeAgo(date: Date) {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
