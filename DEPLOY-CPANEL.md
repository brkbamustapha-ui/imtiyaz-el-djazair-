# Deploying to cPanel

## Static export is not possible

Not a judgement call — the build was attempted and it fails:

```
Error: export const dynamic = "force-static"/export const revalidate not configured
on route "/api/preview/enter" with "output: export"
> Build error occurred
[Error: Failed to collect page data for /api/preview/enter]
```

That is the first blocker of several. The site needs a server because:

| What | Where | Why a static file cannot do it |
|---|---|---|
| 10 route handlers | `/api/*`, `/admin/api/*`, `/media/*` | Each runs code per request |
| 11 files of server actions | `src/app/admin/actions/` | The whole admin saves through them |
| Middleware | `src/middleware.ts` | Guards `/admin` before the page renders |
| Every page | build output marks all `ƒ Dynamic` | Text, photos and settings come from the database at request time |
| Sessions | cookies, `AUTH_SECRET` | Signed server-side |
| Uploads | `/media/[...path]` | Streams bytes out of the database |
| `headers()` in `next.config.ts` | security headers | Next warns they are dropped in an export |

An export would produce a frozen snapshot with no admin, no contact form and no
uploads. So: **Node.js on cPanel.**

The good news is that this project suits shared hosting better than most. It
never writes to disk at runtime — uploads go into the database — so nothing
breaks when the account's filesystem is read-only or wiped on restart.

---

## Before you start

**Node 20 or newer.** cPanel's Node selector offers a list; anything below 20
will not run Next 15. `package.json` now declares this, so npm will say so
rather than letting it fail later.

**The database stays where it is.** The site talks to PostgreSQL over the
network. Keeping the current Supabase database means nothing to migrate — you
only paste its connection string into cPanel. cPanel's own PostgreSQL works too,
but then the data has to be moved across first.

---

## The build

Run this on your machine, or on the server if it gives you a terminal:

```bash
npm ci
npm run build:cpanel
```

That produces `.next/standalone` — a folder holding the server, only the
packages it actually reaches, and the assets. **2,304 files, against 29,475 in
`node_modules`.** Shared hosting counts files against an inode quota, and a full
`node_modules` can exhaust a small account on its own.

The command also does three things that a plain `next build` leaves undone, each
of which breaks a deployment on its own:

- copies `public/` — otherwise no logo, no photographs, no videos
- copies `.next/static/` — otherwise the site loads with no CSS and no JavaScript
- copies Prisma's query engine — otherwise every page that reads the database
  returns 500

It also **deletes `.env` from the bundle.** Next copies it in, and this one holds
the database password, the session signing secret and the first admin password.
A build folder gets zipped, emailed and uploaded; those belong in cPanel's own
environment panel, not in a file that travels.

---

## Setting it up in cPanel

1. **Setup Node.js App → Create Application**
   - Node.js version: **20 or newer**
   - Application mode: **Production**
   - Application root: e.g. `imtiyaz` (a folder outside `public_html`)
   - Application URL: your domain
   - **Application startup file: `server.js`**

2. **Upload** everything inside `.next/standalone/` into the application root.
   Do **not** run *Run NPM Install* — the bundle already carries its modules, and
   installing over it can replace the ones built for this server.

3. **Environment variables** — add these in the same panel:

   | Variable | Required | Value |
   |---|---|---|
   | `DATABASE_URL` | yes | PostgreSQL connection string (the pooled one) |
   | `DIRECT_URL` | yes | The non-pooled string; same value if there is only one |
   | `AUTH_SECRET` | yes | 32+ random characters — `openssl rand -base64 48` |
   | `NEXT_PUBLIC_SITE_URL` | yes | `https://yourdomain.com` — **see the warning below** |
   | `NODE_ENV` | yes | `production` |
   | `ADMIN_EMAIL` | first run | The first Super Admin's address |
   | `ADMIN_PASSWORD` | first run | Their first password; clear it afterwards |
   | `ADMIN_NAME` | first run | Their name |
   | `MAX_UPLOAD_MB` | no | Defaults to `8` |
   | `ALLOW_CUSTOM_SCRIPTS` | no | Keep `false` |
   | `SEED_DEMO_CONTENT` | no | Keep `false` |
   | `ANTHROPIC_API_KEY` | no | Only if you prefer the key here rather than in the dashboard |

4. **Restart** the application.

---

## ⚠ `NEXT_PUBLIC_SITE_URL` must be set *before* you build

Anything named `NEXT_PUBLIC_*` is baked into the JavaScript when the build runs.
Setting it in cPanel afterwards does nothing.

On the current host the site falls back to the platform's own domain when this is
unset. **cPanel provides no such fallback**, so a build without it publishes
`http://localhost:3000` into `robots.txt`, `sitemap.xml`, every canonical URL and
every share preview — pointing Google at its own machine.

So build like this:

```bash
NEXT_PUBLIC_SITE_URL=https://yourdomain.com npm run build:cpanel
```

Check it landed before uploading:

```bash
grep -r "yourdomain.com" .next/standalone/.next/server | head -1
```

---

## If you build on your machine rather than the server

Two packages ship compiled binaries that must match the server:

- **Prisma** — its query engine is built per platform. cPanel is normally
  CloudLinux (RHEL family). If the site starts but every page 500s with a Prisma
  error, add the server's target to `prisma/schema.prisma`:

  ```prisma
  generator client {
    provider      = "prisma-client-js"
    binaryTargets = ["native", "rhel-openssl-3.0.x"]
  }
  ```

  then rebuild. (`debian-openssl-3.0.x` on a Debian/Ubuntu server.)

- **sharp** — resizes images. If pictures fail to load but the pages are fine,
  reinstall it on the server: `npm install --cpu=x64 --os=linux sharp`.

Building on the server avoids both. Prefer it when the account allows it.

---

## Checking it worked

```bash
curl -I https://yourdomain.com                 # 200
curl -s https://yourdomain.com | grep -c "_next/static"   # not 0
curl -I https://yourdomain.com/assets/logo/logo-white.png # 200
curl -s https://yourdomain.com/robots.txt      # your domain, not localhost
```

Then open `/admin/login` and sign in. If the form answers, server actions,
sessions and the database are all working.

---

## When something is wrong

| What you see | Cause |
|---|---|
| Site loads with no styling | `.next/static/` missing — rebuild with `build:cpanel`, do not use a bare `next build` |
| No logo, no photographs | `public/` missing — same cause |
| Every page 500, admin login included | Database unreachable: check `DATABASE_URL`, and that the host allows outbound connections on the database port |
| Every page 500, Prisma named in the log | Wrong query engine — see binary targets above |
| Passenger: "Cannot find module 'next'" | *Run NPM Install* was used on the bundle and overwrote it. Re-upload the bundle |
| `robots.txt` says localhost | `NEXT_PUBLIC_SITE_URL` was not set at build time |
| Admin login says something went wrong | `AUTH_SECRET` missing or shorter than 16 characters |
| App will not start, no error | Node version below 20 |

Passenger writes to `stderr.log` in the application root. Read it first.

---

## What was changed for this, and what was not

Added:

- `server.js` — the startup file Passenger requires. It hands over to the
  standalone bundle when one is present, and otherwise runs the same request
  handler `next start` runs. It is not used by the current host.
- `scripts/build-cpanel.mjs` — the build and packaging step.
- `engines.node` and the `build:cpanel` / `start:cpanel` scripts in
  `package.json`.
- One line in `next.config.ts`: `output: "standalone"` **only when
  `BUILD_STANDALONE=true`**, so `npm run build` behaves exactly as before.

Not touched: any page, component, style, route, database schema or setting. The
site behaves identically — verified by running the bundle and checking every
public page, the admin login, the middleware redirect, the security headers, the
partner carousel and client-side hydration.
