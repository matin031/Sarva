<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Backend: self-hosted MySQL, not Supabase and no longer Postgres

This project ran on Supabase, was migrated to self-hosted PostgreSQL, and is
now on **MySQL 8.4** (`mysql2/promise`, no ORM). Two kinds of stale reference
exist, and they are stale in different ways:

- `supabase`, RLS policies, `service_role`, `@supabase/*` — gone entirely. Say
  so rather than following it.
- `$1` placeholders, `pg`, `jsonb`, `citext`, `RETURNING`, `ON CONFLICT`,
  `to_char`, `make_interval` — these are Postgres. Most surviving mentions are
  deliberate comparison comments explaining *why* the MySQL form differs; those
  are worth reading. But any that look like live instructions are stale.

Three consequences that matter every time you touch data code:

1. **There is no RLS.** Every access rule lives in application code. A query
   that forgets `where user_id = ?`, or a club query that forgets
   `status = 'approved'`, leaks data — the database will not catch it for you.
   `lib/club/queries.ts` explains this at the top; read it before touching any
   query that serves public content.

2. **`middleware.ts` is now `proxy.ts`** (a Next 16 rename), and it runs on the
   Node runtime, so it can reach the database. It refreshes expired access
   tokens; it does not make authorization decisions.

3. **Placeholders are `?`, positional and repeated.** Postgres let you write
   `$1` twice and pass one parameter. MySQL cannot: each `?` consumes the next
   parameter, so a repeated value must be passed twice. `lib/db` does not
   paper over this, because papering over it would hide a real class of bug.

Reference: `API_DOCS.md` for endpoints, `README.md` for architecture,
`mysql-migrations/001_init.sql` for the schema, `docs/DEPLOY_MYSQL.md` for
deployment and rollback, `docs/mysql-schema-manifest.md` for the exact type
mapping. `migrations/` (Postgres) is kept only for rollback — never add to it.

## Verifying database work without a database

`tsc` cannot check SQL inside template literals. These tools exist for that:

- `npm run db:check` — runs against a live database (connection, every table,
  view, generated column, trigger, procedure, the timezone tables, and the
  type-parser behaviour in `lib/db`).
- `npm run db:check-sql` — pulls every SQL template literal out of `lib/`,
  `app/` and `proxy.ts` and hands each one to MySQL as a `PREPARE`. `PREPARE`
  does not run the query but does fully analyse it: table names, column names,
  function signatures and syntax. Run it after touching any query. It also
  runs a static pass that checks every `INSERT` names the columns a `NOT NULL`
  table needs — that pass found seven missing-`id`/`family_id` bugs that
  `PREPARE` alone cannot see, because `PREPARE` does not know what your code
  will bind.
- `npm run db:check-snippets` — the admin console's ready-made snippets, which
  `db:check-sql` deliberately skips (console SQL is user-written, but the
  snippets are ours).
- `npm run db:check-tz` — whether MySQL knows `Asia/Tehran`.

Two lessons from this codebase worth keeping:

`make_interval(mins => $1::double precision)` sat in `lib/auth/otp.ts` and
`app/api/v1/auth/forgot-password/route.ts` for months. It parses perfectly —
it is only wrong once Postgres looks for an overload. Email verification and
password reset returned 500 for every user, with nothing in `tsc` or a parser
to show for it. Parsing is not analysis; `db:check-sql` exists because of that.

And MySQL adds a second class the first one cannot catch: **queries that are
valid but silently wrong.** `CONVERT_TZ` with an unknown zone name returns
`NULL` instead of erroring, so every daily-grouped report quietly empties. A
non-strict `sql_mode` truncates overlong strings instead of rejecting them.
Neither shows up in `PREPARE`. `db:check` and the ETL's `preflight` check for
these specifically.
