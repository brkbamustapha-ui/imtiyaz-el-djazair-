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
| `DATABASE_URL` | yes | Default `file:./dev.db` (SQLite). See section 7 for PostgreSQL. |
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
| Social media links | **Site settings** |
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
| **Contact details** | Admin → Site settings | Address, phone and email are placeholders. |
| **Privacy Policy / Terms** | Admin → Pages | Placeholder text — have both reviewed for your jurisdiction. |
| ~~Logo~~ | `public/assets/logo/logo.png` | **Done** — your own logo file is in place, with its flat background made transparent. The original is at `public/assets/source/logo-original.jpg`. Nothing is drawn in code. |

### 4b. Replacing the logo

The logo is always a real image file. Nothing in this codebase reproduces the
mark in SVG, CSS or type — the current file is the artwork the school supplied,
with only its flat background removed and the margin trimmed.

Two equivalent ways to install it:

1. **Admin → Site settings → Branding** — upload `Logo`, and optionally a
   light-coloured `Logo for dark backgrounds`, a `Favicon` and a share image.
2. **Drop the files into `storage/media/brand/`** on the server:
   `logo.svg` (or `.png`/`.webp`), `logo-dark.svg`, `favicon.png`,
   `og-image.png`. They are served immediately at `/media/brand/…` — no rebuild.
   A file here takes priority over `public/assets/logo/`.

An SVG would be sharper than the current raster file — worth requesting from
whoever designed the mark.

---

## 5. Security

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

### Before you deploy

1. `AUTH_SECRET` — a fresh 32+ character random value.
2. `NEXT_PUBLIC_SITE_URL` — the real domain, e.g. `https://imtiyazeldjazair.com`.
3. `ADMIN_PASSWORD` — blank it once the owner has signed in and changed it.
4. `ALLOW_CUSTOM_SCRIPTS=false` unless the owner needs it.
5. In *Admin → SEO*, turn **indexing** on when the site is ready (it also
   controls `robots.txt`).

### PostgreSQL (recommended for production)

The schema uses only portable column types, so switching provider needs no model
changes:

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `"postgresql"`.
2. Set `DATABASE_URL="postgresql://user:password@host:5432/imtiyaz?schema=public"`.
3. `npx prisma db push` (or `npx prisma migrate deploy`), then `npm run db:seed`.

### Hosting

The app needs a **Node.js runtime** (not a static export) and a **writable disk**
for `storage/` (media uploads, brand artwork and form attachments).

- **A VPS / container** is the simplest fit: `npm ci && npm run build && npm start`
  behind Nginx or Caddy for TLS. Keep the whole `storage/` directory on a
  persistent volume and include it in your backups along with the database.
- **Vercel and similar serverless hosts** have an ephemeral filesystem, so
  uploads would not survive. Point `saveUpload` / `savePrivateUpload` in
  `src/lib/upload.ts` at object storage (S3, R2, Supabase Storage) before
  deploying there, and use a hosted PostgreSQL database.

> **Why uploads do not live in `/public`.** `next start` serves that directory
> from a manifest built at compile time, so a file written after the build is
> never reachable. Runtime media is stored under `storage/media/` and streamed
> by the `/media/[...path]` route handler, which sets `nosniff`, an inline
> disposition and immutable caching, and rejects path traversal.

The in-memory rate limiter is per-instance. Behind more than one instance, back
`src/lib/rate-limit.ts` with a shared store (Redis/Upstash); the persisted
`LoginAttempt` table already covers login throttling across restarts.

---

## 8. Project structure

```
prisma/
  schema.prisma          data model (portable across SQLite/PostgreSQL/MySQL)
  seed.ts                Super Admin + structure + clearly-marked demo content
public/
  assets/                logo, partner logos, photos/, video/, source/ originals
  uploads/               media uploaded from the admin (git-ignored)
storage/
  media/                 Media Library uploads + brand artwork, served by /media
  submissions/           form attachments, never publicly served
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
- **Uploads are local files** under `storage/`. Move them to object storage
  before deploying to a serverless host (see section 7).
- **No logo is bundled.** The project deliberately ships without one rather than
  approximating the school's mark; see §4b.
