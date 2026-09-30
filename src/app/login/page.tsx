"use client";

import { useEffect, useState } from "react";
import {
  AuthError,
  MissingIdentityError,
  acceptInvite,
  getUser,
  handleAuthCallback,
  login,
  refreshSession,
  requestPasswordRecovery,
  signup,
  updateUser,
  type User,
} from "@netlify/identity";

type Mode = "login" | "signup" | "forgot" | "reset" | "invite";

function messageFor(error: unknown) {
  if (error instanceof MissingIdentityError) {
    return "Sign-in isn't available yet: Netlify Identity isn't enabled for this site.";
  }
  if (error instanceof AuthError) {
    if (/not confirmed/i.test(error.message)) {
      return "Your email isn't confirmed yet. Click the link in the confirmation email, then sign in.";
    }
    if (error.status === 400 || error.status === 401 || /invalid_grant/i.test(error.message)) {
      return "No account matches that email and password. If you're new, create an account first.";
    }
    if (error.status === 403) return "Sign-ups are closed. Ask an admin to add you.";
    if (error.status === 422) return "Check your email and password (at least 8 characters).";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

const goHome = () => {
  window.location.href = "/";
};

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [existing, setExisting] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await handleAuthCallback();
        if (result) {
          if (result.type === "recovery") return setMode("reset");
          if (result.type === "invite") {
            setInviteToken(result.token ?? null);
            return setMode("invite");
          }
          return goHome();
        }
      } catch (e) {
        setError(messageFor(e));
      }
      await refreshSession().catch(() => null);
      setExisting(await getUser());
    })();
  }, []);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const name = String(fd.get("name") ?? "");

    run(async () => {
      if (mode === "login") {
        await login(email, password);
        goHome();
      } else if (mode === "signup") {
        const user = await signup(email, password, { full_name: name });
        if (user.confirmedAt) goHome();
        else setNotice("Check your inbox for a confirmation link to finish signing up.");
      } else if (mode === "forgot") {
        await requestPasswordRecovery(email);
        setNotice("If that email has an account, a reset link is on its way.");
      } else if (mode === "reset") {
        await updateUser({ password });
        goHome();
      } else if (mode === "invite" && inviteToken) {
        await acceptInvite(inviteToken, password);
        goHome();
      }
    });
  }

  const titles: Record<Mode, string> = {
    login: "Welcome back",
    signup: "Create your account",
    forgot: "Reset your password",
    reset: "Choose a new password",
    invite: "Accept your invitation",
  };
  const cta: Record<Mode, string> = {
    login: "Sign in",
    signup: "Sign up",
    forgot: "Send reset link",
    reset: "Save password",
    invite: "Set password & join",
  };

  return (
    <main className="grid min-h-screen md:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground md:flex md:flex-col md:justify-between">
        <div className="font-display text-2xl font-bold">Follow-up</div>
        <div className="max-w-md">
          <p className="font-display text-5xl font-bold leading-[1.05]">
            Nothing slips through the cracks.
          </p>
          <p className="mt-6 text-lg text-primary-foreground/80">
            Projects, message boards, and to-dos, plus reminders that chase overdue and quiet work
            for you.
          </p>
        </div>
        <ul className="space-y-2 text-sm text-primary-foreground/70">
          <li>✓ To-do lists with progress at a glance</li>
          <li>✓ @mentions and a personal inbox</li>
          <li>✓ Automatic check-ins on stale tasks</li>
        </ul>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold">{titles[mode]}</h1>

          {existing && (mode === "login" || mode === "signup") && (
            <div className="card mt-6 flex items-center justify-between gap-3 p-4 text-sm">
              <span>
                Signed in as <strong>{existing.email}</strong>
              </span>
              <button className="btn-primary" onClick={goHome}>
                Continue
              </button>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="label" htmlFor="name">Full name</label>
                <input id="name" name="name" className="input" autoComplete="name" required />
              </div>
            )}
            {(mode === "login" || mode === "signup" || mode === "forgot") && (
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" name="email" type="email" className="input" autoComplete="email" required />
              </div>
            )}
            {mode !== "forgot" && (
              <div>
                <label className="label" htmlFor="password">
                  {mode === "reset" || mode === "invite" ? "New password" : "Password"}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="input"
                  minLength={mode === "login" ? undefined : 8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                />
              </div>
            )}

            {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            {notice && <p className="rounded-md bg-primary/10 p-3 text-sm text-primary">{notice}</p>}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={busy}>
              {busy ? "Working…" : cta[mode]}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            {mode === "login" && (
              <>
                <p>
                  New here?{" "}
                  <button className="link" onClick={() => setMode("signup")}>Create an account</button>
                </p>
                <p>
                  <button className="link" onClick={() => setMode("forgot")}>Forgot your password?</button>
                </p>
              </>
            )}
            {(mode === "signup" || mode === "forgot") && (
              <p>
                <button className="link" onClick={() => setMode("login")}>Back to sign in</button>
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
