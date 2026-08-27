# Imtiyaz El Djazair — website + CMS + admin dashboard

A complete institutional website for **Imtiyaz El Djazair — School & Exam Center**,
with a headless CMS and a secure admin dashboard. The owner can change every
piece of public content, the page structure and the visual theme from `/admin`
without touching the code.

- **Public site** — Next.js App Router, server-rendered, trilingual (EN / FR / AR
  with right-to-left support), lazy-loaded Three.js hero.
- **CMS** — pages built from reorderable blocks, draft → preview → publish,
  version history, media library, form builder, menu and footer builders.
- **Admin** — session auth with scrypt hashing, three roles, brute-force
  protection, audit log.

---

## 1. Quick start

**One command** — checks Node, installs, writes `.env`, creates the database,
finds a free port and starts the server:

```bash
bash start.sh
```

It prints the URL to open. Re-running it is safe: it never overwrites a value
you have already set, and it falls back to 3001/3002/5173 when 3000 is busy.

Or step by step:

```bash
npm install
cp .env.example .env          # then edit .env — see section 2
npm run setup                 # prisma generate + db push + seed
npm run dev                   # http://localhost:3000
```

Sign in at **http://localhost:3000/admin** with the `ADMIN_EMAIL` /
`ADMIN_PASSWORD` you put in `.env`. You are asked to change the password
immediately; do that, then blank `ADMIN_PASSWORD` in `.env`.

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm start` | Serve the production build |
| `npm run setup` | Generate the client, create the database, seed it |
| `npm run db:seed` | Re-run the seed (safe to repeat — it never overwrites) |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |

---

## 2. Environment variables

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. **No default** — paste your own. Use the *pooled* string if your provider gives you two. |
| `DIRECT_URL` | yes | Non-pooled string, used only for schema changes (`prisma db push`). With no pooler, set it to the same value as `DATABASE_URL`. Prisma errors at startup if it is missing. |
| `NEXT_PUBLIC_SITE_URL` | yes | Public base URL. Used for canonical URLs, `sitemap.xml`, `robots.txt` and Open Graph tags. |
| `AUTH_SECRET` | yes | 32+ random characters — `openssl rand -base64 48`. Signs session and CSRF tokens. **Change it in production.** |
| `ADMIN_EMAIL` | first run | Email of the initial Super Admin. |
| `ADMIN_PASSWORD` | first run | Only read by the seed script. Hashed with scrypt before storage — never written in clear text, never sent to the browser, never logged. **Blank it after the first login.** |
| `ADMIN_NAME` | no | Display name for that account. |
| `MAX_UPLOAD_MB` | no | Media Library size limit per file (default 8). |
| `ALLOW_CUSTOM_SCRIPTS` | no | `true` lets a Super Admin inject `<script>` tags from Admin → Advanced. Keep it `false` unless you need it. |
| `SEED_DEMO_CONTENT` | no | `false` seeds only the structure, with no demo articles or testimonials. |

### Setting the first admin password

1. Choose a strong password that only you know.
2. Put it in `.env` as `ADMIN_PASSWORD` — **never** in the source code or in a
   commit.
3. Run `npm run db:seed`. The account is created with the password hashed
   (scrypt, per-user salt) and flagged *must change password*.
4. Sign in at `/admin`. You land on **Account & Security** and are required to
   set a new password.
5. Blank `ADMIN_PASSWORD` in `.env`. It is not needed again — re-running the
   seed never touches an account that already exists.

If nobody can sign in: use **Forgot password** on the login page. No mail
transport is configured out of the box, so the reset link is written to the
**server log**; wire an email provider into `requestPasswordResetAction` in
`src/app/admin/actions/auth.ts` to send it instead.

---

## 3. What the owner can change from `/admin`

Nothing on the public site is hard-coded — every item below is stored in the
database and edited from the dashboard.

| Area | Where |
| --- | --- |
| Reorder / hide / duplicate / delete / add page sections | **Website Builder** — drag & drop, with a live device preview |
| All headings, body copy, buttons and links in each section | Website Builder → *Edit* on a section |
| Pages: create, rename, change URL, duplicate, publish, delete | **Pages** |
| Per-page SEO: meta title, description, keywords, share image, canonical, noindex | **Pages** → the search icon |
| News articles and events | **News & Events** |
| Services, statistics, testimonials, FAQ, gallery | The matching item under *Content* |
| Partner and sponsor logos | **Partners & Logos** |
| Images, videos, PDFs | **Media Library** |
| Contact details, address, phone, email, opening hours, map | **Site settings** |
| Social media links (Instagram, TikTok, WhatsApp) | **Site settings** |
| Logo, favicon, share image, site name, tagline | **Site settings** |
| Languages offered and the default language | **Site settings** → Languages |
| Colours, fonts, radius, shadows, animation speed, 3D intensity | **Appearance** |
| Header menu, including sub-menus and the header button | **Menu** |
| Footer columns, links, bottom bar, copyright | **Footer** |
| Popups and announcements | **Popups** |
| Forms and their fields; incoming messages | **Forms & Messages** |
| Site-wide SEO defaults, `robots.txt` behaviour | **SEO** |
| Team accounts and roles | **Users & Roles** |
| Maintenance mode, custom CSS, custom scripts | **Advanced** (Super Admin only) |

### Draft → Preview → Publish

Editing a section saves a **draft**. The public site keeps showing the published
version until you press **Publish**. *Open preview* renders the drafts (visible
only to a signed-in admin — a shared preview link shows nothing unpublished).
A snapshot is taken before every publish, so **Version history** inside the
section editor can roll any block back.

### Languages

Enable EN / FR / AR in *Site settings → Languages*. Text fields then show one
tab per language; a dot marks a language with no text yet, which falls back to
the default. Visitors switch language from the header and the choice is kept in
a cookie. Arabic renders the whole site right-to-left.

**News articles are single-language by design** — publish one article per
language so each has its own URL, summary and search-engine listing.

---

## 4. Content you must replace before going live

The build ships with placeholder material so the site is not empty. The
dashboard shows a reminder until you turn it off in *Site settings*.

| What | Where it lives | Why |
| --- | --- | --- |
| ~~Partner logos~~ | `public/assets/partners/*.png` | **Done** — the official artwork you supplied is in place (British Council, IELTS, Manchester City, BSC Education, TOLES Legal). Originals kept in `public/assets/source/`. |
| **Partner relationships** | Admin → Partners | Descriptions start empty on purpose. Only describe a relationship the school has actually confirmed, and tick *relationship confirmed* once you hold it in writing. |
| ~~Gallery photos~~ | `public/assets/photos/*.webp` | **Done** — the 13 photographs you supplied are in place across three albums (Reception, Campus, Exam Center), and two of them also illustrate the *About* and *Exam Center* sections. Originals kept in `public/assets/source/photos/`. **One caveat:** the files you sent are 289 x 640 pixels — phone-thumbnail size. They are shown at their true size and never enlarged, so they stay sharp, but they cannot fill a large frame. If you have the full-resolution originals, re-upload them through Admin -> Media and the site will use them as-is. |
| ~~Campus videos~~ | `public/assets/video/*.mp4` | **Done** — the seven clips you supplied are live: four in the *Summer Camp* section and three presenting the school on the home page. Each one loads only when a visitor presses play, so they cost nothing to page speed. |
| **Statistics** | Admin → Statistics | 18 teachers / 2,400 students / 12 courses / 10 years are illustrative figures. |
| **Testimonials** | Admin → Testimonials | Invented students. Get written permission before publishing a real name or photo. |
| **News & events** | Admin → News & Events | Marked `TODO(client)` in the article body. |
| **Contact details** | Admin → Site settings | Address, phone and email are still placeholders. The map pin is real, so the street address is the one thing left that does not match it — worth fixing first. |
| ~~Instagram, TikTok, map pin~~ | Admin → Site settings | **Done** — the school's own accounts and Google Maps pin are wired in and show as icons in the footer of every page and on the contact page. Facebook, YouTube, LinkedIn and X were removed at the owner's request: the school has no presence there, so the fields are gone from the dashboard and the icons from the site. WhatsApp is still offered and is empty — an empty field hides its icon, so nothing links to an account that does not exist. |
| **Privacy Policy / Terms** | Admin → Pages | Placeholder text — have both reviewed for your jurisdiction. |
| ~~Logo~~ | `public/assets/logo/logo.png` | **Done** — your own logo file is in place, with its flat background made transparent. The original is at `public/assets/source/logo-original.jpg`. Nothing is drawn in code. |

### 4b. Replacing the logo

The logo is always a real image file. Nothing in this codebase reproduces the
mark in SVG, CSS or type — the current file is the artwork the school supplied,
with only its flat background removed and the margin trimmed.

**Admin → Site settings → Branding** — upload `Logo`, and optionally a
light-coloured `Logo for dark backgrounds`, a `Favicon` and a share image. They
are stored in the database and served immediately at `/media/…`, with no rebuild
and no redeploy.

Two fallbacks exist for when that setting is empty, in this order:

1. A file stored under the `brand/` folder of the file store, named `logo`,
   `logo-dark`, `favicon` or `og-image` with any image extension. There is no
   way to put one there from the dashboard — the Branding uploader above is the
   supported route — but a developer can, with `putFile` from
   `src/lib/storage.ts`.
2. A file committed at `public/assets/logo/logo.png` (or `.svg`/`.webp`/…),
   which is where the school's current logo lives. Committed files need a
   rebuild to change, which is exactly why the dashboard route exists.

An SVG would be sharper than the current raster file — worth requesting from
whoever designed the mark.

---

## 5. Security

### Dependency advisories

`npm audit` reports 5 findings. None is reachable from the internet, and the
list below is the reasoning, not a dismissal — re-check it before each deploy,
because a build-time-only issue stops being harmless the day something starts
feeding it untrusted input.

| Package | Where it runs | Why it is not exposed |
| --- | --- | --- |
| `prisma`, `@prisma/config`, `deepmerge-ts` | CLI only, at build and migration time | `@prisma/client` — the part that serves requests — is not affected. npm proposes "prisma@6.12.0", which is a **downgrade**; taking it would lose 7 releases of fixes to remove a stack-exhaustion bug in a config loader that only ever reads your own `schema.prisma`. |
| `postcss` (8.4.31, nested inside `next`) | Build time, on this project's own CSS | Never invoked at runtime. Its worst finding — XSS through an unescaped `</style>` — is separately blocked in the one place user-supplied CSS reaches the page: Admin → Advanced strips `<style`/`</style`/`<script` both when saving and again when rendering, and the field is Super Admin only. Fixing the advisory needs Next 16, a major upgrade. |
| `next` (moderate) | — | Also needs Next 16. |

Fixed on 15.5.24: the **critical** RCE in the React flight protocol, the Server
Actions source-code exposure, and the Server Components denial of service — all
three directly relevant, since the whole dashboard is built on Server Actions.
`sharp` was raised to 0.35.4 in the same pass: it decodes **uploaded** images,
which makes its libvips CVEs the only ones an outsider could have reached.

Pin these versions when you deploy; do not let a floating range pull an
unpatched build.

- **Passwords** — scrypt with a per-user salt (`scrypt$salt$hash`). Never stored
  in clear text, returned to the browser, or logged.
- **Sessions** — opaque random token in an `HttpOnly`, `SameSite=Lax`,
  `Secure`-in-production cookie. Only the token's HMAC is stored, so a database
  leak is not a session leak. Eight-hour sliding expiry.
- **Brute force** — per-IP and per-account rate limits, plus a 15-minute account
  lock after 6 failed attempts. Attempts are also persisted, so restarting the
  server does not reset the throttle.
- **Authorisation** — every mutating server action calls `requirePermission`.
  Hiding a button in the UI is never the only check.
- **CSRF** — Server Actions carry Next.js' origin check; the REST endpoints
  (public forms, uploads) additionally use a double-submit token issued by the
  middleware, plus an origin check.
- **Uploads** — magic-number sniffing (the browser's declared MIME type is not
  trusted), extension whitelist, size cap, SVG sanitising, automatic downscaling,
  and `X-Content-Type-Options: nosniff` on `/uploads`.
- **Form attachments** — written outside `public/`, downloadable only through an
  authenticated route, and always as an attachment.
- **Spam** — honeypot field, minimum fill time, rate limit, server-side
  validation of every field.
- **XSS** — CMS rich text is stripped of `<script>`, `<iframe>`, inline event
  handlers and `javascript:` URLs before storage and again before rendering.
  CMS-authored links are restricted to same-origin paths and `http(s)`/`mailto:`/`tel:`.
- **Custom scripts** — Super Admin only *and* gated behind `ALLOW_CUSTOM_SCRIPTS`.
- **Audit log** — every administrative action, with actor and IP, under
  *Activity log*.
- **Headers** — HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy` and a restrictive `Permissions-Policy` on every response.

### Roles

| | Super Admin | Admin | Editor |
| --- | :-: | :-: | :-: |
| Edit content, upload media | ✓ | ✓ | ✓ |
| Publish, delete, manage pages and media | ✓ | ✓ | — |
| Appearance, menu, footer, partners, forms, popups, SEO | ✓ | ✓ | — |
| Users, roles, custom CSS/JS, maintenance mode | ✓ | — | — |

The account created from `ADMIN_EMAIL` is the Super Admin. The last active Super
Admin cannot be demoted, disabled or deleted.

---

## 6. Performance & accessibility

- The Three.js scene is code-split and only fetched once the browser is idle.
  It is skipped entirely on low-power devices (few cores, little memory,
  save-data, slow network) and whenever the visitor prefers reduced motion — a
  designed CSS gradient stands in. It unmounts when the hero scrolls away.
- Particle count and pixel ratio scale with the detected device tier; the owner
  can lower or disable 3D globally from *Appearance*.
- Images go through `next/image` (AVIF/WebP, lazy by default); uploads over
  2400px are downscaled and re-encoded to WebP on the server.
- `prefers-reduced-motion` is honoured throughout, and *Appearance* has its own
  master animation switch.
- Keyboard navigation, a skip link, visible focus rings, labelled controls, alt
  text managed from the Media Library, and semantic landmarks throughout. The
  FAQ uses native `<details>`/`<summary>` so it works with no JavaScript.

---

## 7. Deployment

### The database is PostgreSQL

SQLite is gone. It cannot work on a serverless host: the filesystem there is
read-only, and every invocation gets its own copy, so a write is lost the moment
the request ends and no two requests agree on the data. Postgres runs both
locally and in production, so what you test is what ships.

Uploaded files went the same way. The Media Library, brand artwork and form
attachments used to be written under `storage/`; they are now rows in the
database (`StoredFile`, see `src/lib/storage.ts`) and served by the same
`/media/<folder>/<file>` URLs as before. That keeps the whole site on one
service — no bucket, no second set of credentials.

Files that are part of the design — the logo, partner marks, the campus
photographs, the videos — are **not** in the database. They are committed under
`public/assets`, ship inside the deployment and are served as static files.

### Deploying to Vercel

**1. Create a PostgreSQL database.** Vercel dashboard → *Storage* → *Create
Database* → Postgres, or a free database at [Neon](https://neon.tech) or
[Supabase](https://supabase.com/database). Copy the connection strings it gives
you — a *pooled* one and a *direct* one. Nobody can guess these for you.

**2. Set the environment variables** in Vercel → *Settings* → *Environment
Variables*, for Production (and Preview, if you use it):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the **pooled** connection string |
| `DIRECT_URL` | the **direct** connection string (same value if there is only one) |
| `AUTH_SECRET` | a fresh 32+ character random value — `openssl rand -base64 48` |
| `NEXT_PUBLIC_SITE_URL` | your real domain, e.g. `https://imtiyazeldjazair.com` |
| `MAX_UPLOAD_MB` | optional, default `8` |
| `ALLOW_CUSTOM_SCRIPTS` | `false` |
| `SEED_DEMO_CONTENT` | `false` once you have your own content |

Do **not** set `ADMIN_PASSWORD` in Vercel. It is only read by the seed script,
which you run from your own machine in step 3.

**3. Create the schema and the owner account**, once, from your machine —
pointing at the production database:

```bash
DATABASE_URL="<direct string>" DIRECT_URL="<direct string>" \
ADMIN_EMAIL="owner@yourdomain.com" ADMIN_PASSWORD="<choose one>" \
  npx prisma db push && npm run db:seed
```

Use the **direct** string here: `db push` cannot run over a transaction-mode
pooler. Then clear `ADMIN_PASSWORD` from your shell history — the account exists
now, and you will be asked to change the password at first login.

**4. Deploy.** Vercel runs `npm run build`, which is
`prisma generate && next build`. Nothing else is needed: no build-time database
access, no migration step in the pipeline.

### What is still true anywhere you host

- The app needs a **Node.js runtime** — it is not a static export.
- The in-memory rate limiter is per-instance. Across several instances, back
  `src/lib/rate-limit.ts` with a shared store (Redis/Upstash). The persisted
  `LoginAttempt` table already covers login throttling across restarts.
- Media is served by the `/media/[...path]` route, which sets `nosniff`, an
  inline disposition and immutable caching, and refuses private attachments.
  Immutable caching means the CDN answers after the first hit, so serving files
  from Postgres costs one query per file, not one per visitor.
- If the Media Library ever outgrows the database (many large videos), move
  `putFile`/`getFile` in `src/lib/storage.ts` to object storage. Nothing else
  in the codebase needs to change — that is the whole point of the module.

### Before you go live

1. `AUTH_SECRET` — a fresh random value, not the one from `.env.example`.
2. `NEXT_PUBLIC_SITE_URL` — the real domain.
3. `ADMIN_PASSWORD` — blank everywhere once the owner has signed in.
4. `ALLOW_CUSTOM_SCRIPTS=false` unless the owner needs it.
5. In *Admin → SEO*, turn **indexing** on when the site is ready (it also
   controls `robots.txt`).

---

## 8. Project structure

```
prisma/
  schema.prisma          data model (PostgreSQL; portable enough for MySQL)
  seed.ts                Super Admin + structure + clearly-marked demo content
public/
  assets/                logo, partner logos, photos/, video/, source/ originals
  uploads/               media uploaded from the admin (git-ignored)
src/
  app/
    (site)/              public website
    admin/               dashboard: login, (dashboard)/*, actions/*, api/*
    api/                 public endpoints: form submission, analytics, preview
    globals.css          public design tokens + component layer
    admin/admin.css      admin design system (independent of the site theme)
  components/
    sections/            one component per block type + the section renderer
    public/              navbar, footer, logo, lightbox, forms, popup
    admin/               shell, schema-driven editors, managers
    ui/                  icons, reveal, counter, magnetic button, tilt card
    3d/                  Three.js scene, device-capability detection, fallbacks
  lib/                   auth, permissions, settings, theme, i18n, uploads, forms
  server/                cached data access for the public site and the admin
```

### Two ideas hold the CMS together

1. **Schema-driven editing.** `src/lib/section-types.ts`, `src/lib/collections.ts`
   and `src/lib/settings-fields.ts` describe fields once. `FieldsEditor` renders
   the form, and `coerceField` validates the same schema on the server. Adding a
   field is a one-line change with no new UI code.
2. **Blocks, not templates.** A page is an ordered list of `Section` rows. Adding
   a new kind of block means one entry in `section-types.ts` plus one component
   registered in `SectionRenderer.tsx`.

---

## 9. Known limitations

- **No email transport.** Form submissions and password resets appear in the
  dashboard and the server log respectively. Add an SMTP or API provider where
  the code marks it if you want email delivery.
- **Analytics are deliberately minimal** — first-party page-view counts with a
  random per-browser id. No third-party tracker, no personal data.
- **News articles are single-language** (one article per language, by design).
  Sections, collections, menus, footer and settings are fully translatable.
- **Uploads live in the database**, not on disk, so the site runs on a
  serverless host with no bucket to configure. Fine for images and PDFs; move
  `src/lib/storage.ts` to object storage if the Media Library ever fills with
  large videos (see section 7).
- **No logo is bundled.** The project deliberately ships without one rather than
  approximating the school's mark; see §4b.
