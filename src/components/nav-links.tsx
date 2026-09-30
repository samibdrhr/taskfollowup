"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; badge?: number };

export function NavLinks({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 md:flex-col">
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" || pathname.startsWith("/projects") : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {item.label}
            {item.badge ? (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-center text-xs font-bold",
                  active ? "bg-primary-foreground text-primary" : "bg-accent text-accent-foreground",
                )}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
