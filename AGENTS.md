<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Backend: self-hosted Postgres, not Supabase

This project **used to** run on Supabase and was migrated off it. If you see
anything referring to `supabase`, RLS policies, `service_role`, or
`@supabase/*`, it is stale — say so rather than following it.

Two consequences that matter every time you touch data code:

1. **There is no RLS.** Every access rule lives in application code. A query
   that forgets `where user_id = $1`, or a club query that forgets
   `status = 'approved'`, leaks data — the database will not catch it for you.
   `lib/club/queries.ts` explains this at the top; read it before touching any
   query that serves public content.

2. **`middleware.ts` is now `proxy.ts`** (a Next 16 rename), and it runs on the
   Node runtime, so it can reach the database. It refreshes expired access
   tokens; it does not make authorization decisions.

Reference: `API_DOCS.md` for endpoints, `README.md` for architecture,
`migrations/001_init.sql` for the schema.

## Verifying database work without a database

`tsc` cannot check SQL inside template literals. Two tools exist for that:

- `npm run db:check` — runs against a live database (connection, every table,
  view, enum, trigger, and the type-parser behaviour in `lib/db`).
- `npm run db:check-sql` — pulls every SQL template literal out of `lib/`,
  `app/` and `proxy.ts` and hands each one to Postgres as a `PREPARE` inside a
  transaction that is rolled back. `PREPARE` does not run the query but does
  fully analyse it: table names, column names, **function signatures** and type
  compatibility. Run it after touching any query.
- When no database is available, parse the SQL with `libpg-query` (the real
  Postgres parser). Doing this caught a `FILTER` clause attached to the wrong
  expression in `lib/auth/otp.ts` that typechecked cleanly and would have
  failed at runtime.

Parsing alone is not enough, and the reason is worth remembering.
`make_interval(mins => $1::double precision)` sat in `lib/auth/otp.ts` and
`app/api/v1/auth/forgot-password/route.ts` from the day of the Postgres
migration. It parses perfectly — it is only wrong once Postgres looks for an
overload, because `mins` is `integer` and only `secs` is `double precision`.
So email verification and password reset both returned 500 for every user,
for months, with nothing in `tsc` or a parser to show for it. `db:check-sql`
exists because of those two, and it is the check that finds that class of bug.
