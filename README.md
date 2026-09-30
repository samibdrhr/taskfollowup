# Basecamp-style Task & Project System

Closer to Basecamp: Projects, Message Board, To-do Lists, Subtasks, Inbox, Mentions, People admin, Settings, and role permissions — plus automatic follow-up reminders.

## Features

### People & Admin
- Invite / create users
- Assign roles: Admin, Manager, Employee
- Change roles anytime (Admin)

### Inbox + Mentions
- Personal Inbox (assignments, mentions, comments, reminders)
- @mentions in messages and comments
- Notification bar + unread badges

### Projects (deep)
- Message Board (pin, comments)
- To-do Lists with progress pie charts
- To-dos with assignee, due date, status, check-in interval
- Subtasks
- Comments on tasks and messages

### Permissions
- Admin: full control + people + company settings
- Manager: projects, lists, tasks, messages, members
- Employee: work on assigned tasks, comment, post messages

### Settings
- Profile (name, title)
- Company name (Admin)

### Follow-up engine
- Stale / overdue detection
- Email + inbox reminders via cron

## Getting started

Accounts are managed by Netlify Identity. There are no pre-made demo logins.

1. Open the site and choose **Create an account**.
2. Confirm your email using the link Netlify sends you, then sign in.
   To skip confirmation, enable **Autoconfirm** under Project configuration > Identity.
3. The first person to sign in becomes the **Admin**. After that, new people join as Employees.
   Admins can change roles on the People page, or add people ahead of time with a role and an optional temporary password.

To stop strangers from signing up, set Identity registration to **Invite only** in the Netlify UI.

## Local development

```bash
npm install
netlify dev
```

Data lives in Netlify Database (Postgres, via Drizzle ORM, schema in `db/schema.ts`). Migrations in `netlify/database/migrations/` are applied automatically on deploy.

Email reminders need the `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` environment variables. Without them, reminders only go to the in-app inbox.
