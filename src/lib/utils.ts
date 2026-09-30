import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string, email = "") {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export function displayName(user: { name: string; email: string } | null | undefined) {
  if (!user) return "Someone";
  return user.name.trim() || user.email;
}

/** The @handle used for mentions: the local part of the email address. */
export function mentionHandle(email: string) {
  return email.split("@")[0].toLowerCase();
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
