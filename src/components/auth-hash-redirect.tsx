"use client";

import { useEffect } from "react";

/** Identity emails link back with a token in the URL hash; hand those to the login page. */
export function AuthHashRedirect() {
  useEffect(() => {
    const { hash, pathname } = window.location;
    if (
      pathname !== "/login" &&
      /(confirmation|recovery|invite|email_change)_token=|access_token=|error=/.test(hash)
    ) {
      window.location.replace(`/login${hash}`);
    }
  }, []);
  return null;
}
