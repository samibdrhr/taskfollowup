import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@db/index";
import { companySettings, notifications } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { Avatar, RoleBadge } from "@/components/ui";
import { NavLinks } from "@/components/nav-links";
import { LogoutButton, SessionKeeper } from "@/components/session";
import { displayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [[company], [{ unread }]] = await Promise.all([
    db.select().from(companySettings).where(eq(companySettings.id, 1)),
    db
      .select({ unread: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, false))),
  ]);

  const items = [
    { href: "/", label: "Home" },
    { href: "/inbox", label: "Inbox", badge: unread },
    { href: "/people", label: "People" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <SessionKeeper />
      <aside className="border-b bg-white/60 p-4 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-r md:p-5">
        <div className="mb-4 flex items-center justify-between md:mb-8 md:block">
          <Link href="/" className="block">
            <div className="font-display text-xl font-bold">Follow-up</div>
            <div className="text-xs text-muted-foreground">{company?.name ?? "Our Company"}</div>
          </Link>
          {unread > 0 && (
            <Link href="/inbox" className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold md:hidden">
              {unread} new
            </Link>
          )}
        </div>
        <NavLinks items={items} />
        <div className="mt-auto hidden border-t pt-4 md:block">
          <div className="mb-2 flex items-center gap-3 px-1">
            <Avatar user={user} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{displayName(user)}</div>
              <RoleBadge role={user.role} />
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-10 md:py-12">{children}</main>
    </div>
  );
}
