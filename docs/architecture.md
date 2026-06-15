# Architecture

WorkSphere starts as a Next.js modular monolith with strict module boundaries so high-traffic domains can later move into services without rewriting business rules.

## Principles

- Domain Driven Design for business modules.
- Clean Architecture inside each module.
- Tenant isolation enforced at request, persistence, and authorization layers.
- Event-driven integration between modules.
- CQRS-ready application services for read and write separation.

## Application Layers

- Presentation: App Router pages, layouts, and focused client components.
- Application: server actions for commands, server components for authenticated reads, and transaction boundaries.
- Domain: tenant, identity, employee, attendance, leave, payroll, recruitment, and performance rules.
- Infrastructure: Prisma persistence, cookie-backed JWT sessions, email, files, and external integrations.

## Initial Modules

- Identity and access management.
- Tenant management.
- Employee lifecycle.
- Attendance.
- Leave.
- Payroll.
- Recruitment.
- Performance.
- Billing.
- Notifications.
- Audit.

## Tenant Model

Each tenant owns isolated HR, payroll, attendance, recruitment, and document records. The initial database strategy uses a shared SQLite database with tenant-scoped rows, mandatory tenant filters, and Prisma constraints for tenant-safe uniqueness. Enterprise tenants can later be migrated to dedicated schemas or databases.
