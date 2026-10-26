# Enterprise Jira Clone (.NET 10 + PostgreSQL + Next.js)

A full-featured Jira clone built with **.NET 10 Web API**, **PostgreSQL**, and a modern **Next.js** frontend. Fully compatible with Atlassian Jira data structures, with native support for Jira Standard JSON & CSV export and import.

---

## 🌟 Architecture & Stack

| Layer | Technology | Details |
|---|---|---|
| **Backend API** | .NET 10 (ASP.NET Core Web API) | C# 13, EF Core 10, Npgsql PostgreSQL provider, CsvHelper, Swashbuckle OpenAPI |
| **Database** | PostgreSQL (Remote Cluster) | `pg8001.site4now.net:6432`, Database: `db_a66689_jira` |
| **Frontend** | Next.js (App Router) + Tailwind CSS | React 19, TypeScript, Atlassian-inspired UI, Drag & Drop Board, Backlog & Sprints |
| **Interoperability** | Jira REST API v2 / Cloud / Server | Standard Jira JSON & CSV Export / Import engine, `/rest/api/2/...` compatibility |

---

## 🚀 Key Features

### 1. Active Kanban & Scrum Board
- Real-time drag-and-drop workflow status transitions across **TO DO**, **IN PROGRESS**, **IN REVIEW**, and **DONE**.
- Issue cards with summary, issue type icons (Epic, Story, Task, Bug, Subtask), key link (e.g. `ERP-1`), priority indicators, story points, and assignee avatars.
- Quick filter buttons: "Only My Issues", "Unassigned", and Issue Type filter tabs.
- Quick-add issue action directly at the bottom of each column.

### 2. Backlog & Sprint Planning
- Multi-sprint management: Active sprint, Planned future sprints, and Project Backlog.
- Sprint Velocity & Story Points totals calculated live (`completed / total pts`).
- One-click sprint lifecycle: **Start Sprint**, **Complete Sprint** (with automated migration of unfinished tickets to next sprint or backlog).
- Create Sprint modal with sprint goals and timeline estimation.

### 3. Issue Detail Modal & Time Tracking
- Full editable summary and rich markdown description.
- Status, Priority, Assignee, Reporter, Story Points, Sprint, and Label pickers.
- **Activity Tabs**:
  - **Comments**: Add, view, and delete comments with author timestamps.
  - **Worklogs**: Log time spent (minutes/hours) with notes; visual progress bar for logged vs. original estimate.
  - **History**: Full audit trail tracking every status change, assignment, and update.

### 4. Jira Data Compatibility, Export & Import
- **Jira Standard JSON Export**: Generates official Atlassian Jira Cloud & Server export document with issue keys, custom fields (`customfield_10026` for Story Points, `customfield_10020` for Sprints, `customfield_10014` for Epics), nested comments, and timetracking.
- **Jira Standard CSV Export**: Exports CSV format matching the official Jira CSV Importer specification with headers (`Issue Type`, `Issue key`, `Summary`, `Description`, `Status`, `Priority`, `Resolution`, `Assignee`, `Reporter`, `Story Points`, `Sprint`, `Labels`, `Components`, `Created`, `Updated`, `Comment`).
- **Jira JSON & CSV Importer**: Upload and ingest existing Jira backup exports directly into PostgreSQL with automatic sprint creation, issue key mapping, and conflict prevention.
- **Sample Templates**: One-click download of sample Jira JSON and CSV files for instant testing.

### 5. Jira REST API v2 Endpoints
Exposes standard Jira REST endpoints so external Jira CLI tools, scripts, and webhook integrations work transparently:
- `GET  /rest/api/2/serverInfo`
- `GET  /rest/api/2/myself`
- `GET  /rest/api/2/project`
- `GET  /rest/api/2/project/{key}`
- `GET  /rest/api/2/issue/{key}`
- `GET  /rest/api/2/search?jql={jql}` (e.g. `jql=project = 'ERP'`)
- `POST /rest/api/2/issue`

---

## 🛠️ How to Run

### Backend (.NET 10 Web API)
```bash
cd "jira-clone/backend/JiraClone.Api"
dotnet run --urls "http://localhost:5000"
```
- API Base: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/swagger`

### Frontend (Next.js)
```bash
cd "jira-clone/frontend"
npm run dev -- -p 3000
```
- Web Application: `http://localhost:3000`

### Docker Compose (API + Frontend)
```bash
cp .env.example .env   # then set DB_CONNECTION_STRING
docker compose up -d --build
```
- Web Application: `http://194.233.85.194:3001`
- API Base: `http://194.233.85.194:5050`

The frontend calls the API from the browser, so `NEXT_PUBLIC_API_URL` is baked in at build time. To run elsewhere (e.g. locally), set `NEXT_PUBLIC_API_URL=http://localhost:5050` in `.env` and rebuild the `web` image (`docker compose build web`).

---

## 🧭 Navigation & URLs
Navigation works like Jira Cloud: every page has its own address, so the browser's Back/Forward buttons, refresh, bookmarks, "open in new tab" and shared links all work. After logging in you land on the page the link pointed to.

| Page | URL |
|---|---|
| For you (home) | `/jira/for-you` |
| Spaces directory | `/jira/projects` |
| Board | `/jira/software/projects/ERP/boards/1` |
| Backlog · Timeline · Reports | `/jira/software/projects/ERP/boards/1/backlog` · `/timeline` · `/reports` |
| List · Releases · Space settings | `/jira/software/projects/ERP/list` · `/versions` · `/settings` |
| Issue | `/browse/ERP-12`, or `?selectedIssue=ERP-12` on any page |
| Search (JQL) · People | `/issues` · `/jira/people` |
| Workspace settings · Import & export | `/jira/settings/workspace` · `/jira/settings/system/import-export` |
| Administration | `/admin`, `/admin/users`, `/admin/sessions`, `/admin/email` |

**Top bar** (like Jira Cloud's): sidebar toggle, app switcher, workspace switcher, search and **Create** in the middle, then notifications, help (help articles, keyboard shortcuts), settings (personal settings, spaces, work items, system, apps; user management and permissions for admins) and your profile (account settings, your work, assigned to me, log out).

**Sidebar**: For you · Recent (spaces and work items) · Starred (spaces and filters) · Apps · Plans · Spaces (starred and recent spaces; expand one to jump to its Timeline, Backlog, Board, List, Reports or Releases; `•••` for space settings and starring) · Filters (Jira's default filters such as *My open work items*, *Reported by me*, *Done work items*, plus your saved filters) · Dashboards · Teams · More. **More → Customize sidebar** shows, hides and reorders items for you only; hidden items stay under More. Collapse the sidebar from the top bar or with `Ctrl + [`.

**Keyboard shortcuts** (press `?` to see them): `/` search, `c` create, `g` then `f`/`p`/`a`/`b`/`i`/`d` for For you, Spaces, Board, Backlog, Search and Dashboards, `1`/`2`/`3` for Backlog/Board/Reports inside a space, `Esc` closes the open work item.

Inside a space, a shared header shows the space name (click to rename), star, share link and the Timeline / Backlog / Board / List / Reports / Releases tabs. Search links work like Jira's issue navigator: `/issues?jql=…` runs a query and `/issues?filter=ID` opens a saved filter.

---

## 🔐 Login & Administration
- Every page and API endpoint requires signing in. The login screen accepts a username or an email address.
- A built-in **`admin`** account is created on first start. Its password comes from `Admin:Password` — `ADMIN_PASSWORD` in `.env` for Docker, or `dotnet user-secrets set "Admin:Password" "<password>"` locally. If none is set, a random password is generated and printed once in the API log. An existing admin password is never overwritten.
- Administrators open **Settings (⚙) → Administration** to create users, set or reset passwords, grant or remove admin access, deactivate users, and revoke active sessions.
- Existing users have no password until an administrator sets one. Users change their own password under **Account settings → Security & API**.
- Jira REST API clients can use HTTP Basic auth (`curl -u admin:<password> http://<host>:5050/rest/api/2/myself`) or a session token (`Authorization: Bearer <token>` from `POST /api/auth/login`).
- Login attempts are limited to 10 per minute per IP address.

### Forgot password & email (SMTP)
- Administrators configure the outgoing mail server in **Administration → Email (SMTP)**: host, port, security (STARTTLS / SSL/TLS / none), username, password, sender, and the Jira site URL used in links. Use **Send test email** to check the settings before saving. The SMTP password is stored encrypted (ASP.NET Data Protection, keys kept in the `data_protection_keys` table) and is never returned by the API.
- **Can't log in?** on the login screen emails a recovery link. The link opens `/reset-password`, expires after 1 hour, works once, and signs the user out everywhere when used. The response is the same whether or not the account exists, at most one email per account is sent every 2 minutes, and requests are limited to 5 per 10 minutes per IP address.
- From **Administration → Users**, admins can email a password reset link or an invite (a 3-day link to choose a first password), and can invite people by email when creating them.

---

## 🗄️ Database Configuration
The connection string is read from `ConnectionStrings:DefaultConnection`. `appsettings.json` ships with a local default (`Host=localhost;Port=5432;Database=jira;Username=jira;Password=jira`). Real credentials are never committed:

- **Local development** – store them in .NET user-secrets:
  ```bash
  cd backend/JiraClone.Api
  dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=<host>;Port=<port>;Database=<db>;Username=<user>;Password=<password>;SSL Mode=Prefer;Trust Server Certificate=true;"
  ```
- **Docker / production** – set the `ConnectionStrings__DefaultConnection` environment variable.

Database tables (`projects`, `issues`, `sprints`, `issue_comments`, `worklogs`, `activity_logs`, `app_users`) and initial seed data are automatically verified and initialized on startup.

Admin login: username admin, password Jira-LTwY4UukU9XH
