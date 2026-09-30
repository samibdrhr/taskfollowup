"use client";

import { useEffect } from "react";
import { AUTH_EVENTS, getUser, logout, onAuthChange } from "@netlify/identity";

/** Keeps the browser session (and its token refresh timer) alive while the app is open. */
export function SessionKeeper() {
  useEffect(() => {
    getUser();
    return onAuthChange((event) => {
      if (event === AUTH_EVENTS.LOGOUT) window.location.href = "/login";
    });
  }, []);
  return null;
}

export function LogoutButton() {
  return (
    <button
      className="btn-ghost w-full justify-start"
      onClick={async () => {
        try {
          await logout();
        } finally {
          window.location.href = "/login";
        }
      }}
    >
      Sign out
    </button>
  );
}
