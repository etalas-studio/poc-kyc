# poc-kyc-pwa

A Next.js proof-of-concept Progressive Web App. The project now uses Prisma as the ORM and a Neon-hosted PostgreSQL instance for persistence.

## Requirements

- Node.js 18+
- npm 10+
- A Neon project with both pooled and direct Postgres connection strings

## Getting Started

Install dependencies and generate the Prisma client:

```bash
npm install
npm run prisma:generate
```

Create a `.env` file based on the provided template and add your Neon credentials:

```bash
cp .env .env.local # optional, but keeps secrets out of version control
```

```env
DATABASE_URL="postgresql://<username>:<password>@<project-id>.pooler.<region>.neon.tech/neondb?sslmode=require"
DIRECT_DATABASE_URL="postgresql://<username>:<password>@<project-id>.<region>.neon.tech/neondb?sslmode=require"
```

- `DATABASE_URL` should use the **connection pooling** string from Neon.
- `DIRECT_DATABASE_URL` should use the **primary connection string**. Prisma relies on this for migrations.

Start the dev server once environment variables are configured:

```bash
npm run dev
```

The default API example lives at `src/app/api/users/route.ts` and demonstrates basic `GET`/`POST` interactions using Prisma.

## Database Workflow

- Introspect or edit models in `prisma/schema.prisma`.
- Create migrations locally (requires a reachable Neon database):

  ```bash
  npm run prisma:migrate-dev -- --name init
  ```

- Deploy migrations in CI/production:

  ```bash
  npm run prisma:migrate
  ```

- Regenerate the Prisma client after every schema change:

  ```bash
  npm run prisma:generate
  ```

- Optional: inspect data with Prisma Studio

  ```bash
  npm run prisma:studio
  ```

## Project Structure

- `src/lib/prisma.ts` exports a singleton `PrismaClient` configured for serverless environments.
- `src/app/api/users/route.ts` shows how API routes can interact with Prisma.
- `prisma/schema.prisma` defines the data model (currently a sample `User`).

## Useful Links

- [Prisma Docs](https://www.prisma.io/docs)
- [Neon Docs](https://neon.tech/docs)
- [Next.js Docs](https://nextjs.org/docs)
