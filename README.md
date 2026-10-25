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
- Web Application: `http://194.233.85.194:3000`
- API Base: `http://194.233.85.194:5050`

The frontend calls the API from the browser, so `NEXT_PUBLIC_API_URL` is baked in at build time. To run elsewhere (e.g. locally), set `NEXT_PUBLIC_API_URL=http://localhost:5050` in `.env` and rebuild the `web` image (`docker compose build web`).

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
