# WorkSphere Enterprise HRMS

WorkSphere Enterprise HRMS is a unified React application for a multi-tenant HRMS and payroll SaaS platform.

We recently transitioned to a single, easily deployable **React (Vite) + PocketBase (SQLite)** architecture with Supabase and Local Mock fallbacks.

## Architecture Highlights
- **Framework**: React (Vite)
- **Backend/Database**: PocketBase (SQLite) with Supabase & Local Mock database fallbacks.
- **Styling**: Tailwind CSS

## Current Scope

The current implementation establishes the platform foundation:
- Multi-tenant data isolation.
- Identity and RBAC starter domain.
- PocketBase and Mock database schemas.
- Modern dashboard shell.

## Local Development

Prerequisites:
- Node.js 20+

### Setup and Running

1. **Start PocketBase (Backend)**:
   ```powershell
   cd backend
   .\pocketbase.exe serve
   ```
   *Note: If PocketBase is not running, the application will automatically fall back to a mock mode using LocalStorage.*

2. **Run the Frontend**:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

The application will be available at `http://localhost:5173`.

