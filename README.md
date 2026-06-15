# WorkSphere Enterprise HRMS

WorkSphere Enterprise HRMS is a unified Next.js application for a multi-tenant HRMS and payroll SaaS platform.

We recently transitioned from a complex, multi-service architecture (Java Spring Boot, Docker PostgreSQL/RabbitMQ, Next.js) to a single, easily deployable **Next.js + Prisma (SQLite)** architecture.

## Architecture Highlights
- **Framework**: Next.js 15 (App Router, Server Actions)
- **Database**: SQLite (via Prisma ORM)
- **Styling**: Tailwind CSS
- **Deployment**: Can easily be deployed to Vercel with zero Docker configuration.

## Current Scope

The current implementation establishes the platform foundation:
- Multi-tenant data isolation.
- Identity and RBAC starter domain.
- SQLite + Prisma database setup.
- Next.js dashboard shell.

## Local Development

Prerequisites:
- Node.js 20+

### Setup

```powershell
cd frontend
npm install
copy .env.example .env
npx prisma db push
```

Set `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, and `SUPER_ADMIN_PASSWORD` in `frontend/.env`. The first login attempt seeds the configured super admin if it does not already exist.

### Run the Application

Start the Next.js development server:

```powershell
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`. You no longer need to run any separate backend or Docker containers!
