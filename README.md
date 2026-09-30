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

## Setup (Windows)

```cmd
cd task-followup
npm install --legacy-peer-deps
copy .env.example .env
notepad .env
```

Set:
```
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="k8xP2mR9vL4qW7nJ3tY6bH1cF5sA0dG8eU4iO2zX9"
```

Then:
```cmd
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000

### Logins (password: password123)
- admin@company.com (Admin)
- manager@company.com (Manager)
- john@company.com / jane@company.com (Employee)
