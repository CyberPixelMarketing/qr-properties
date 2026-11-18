# QR Properties

A bilingual (Arabic / English) real-estate listing platform for the UAE market.
Each advertiser gets **one QR code** that opens their public page, where listings are sorted **nearest-first** from the visitor's location.

Built by DUNE AI.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router), TypeScript (strict), Tailwind CSS v4 |
| i18n | `next-intl` — locale in the URL (`/ar`, `/en`), full RTL/LTR |
| Backend | Supabase — Auth, Postgres + PostGIS, Storage, Row Level Security |
| Hosting | Vercel |

### Extra libraries (and why)

| Package | Why |
|---|---|
| `@supabase/ssr` | Cookie-based Supabase sessions for the App Router and middleware |
| `next-intl` | Translations, locale routing, RTL/LTR |
| `zod` | Server-side validation of every form/action |
| `lucide-react` | Icon set (tree-shaken) |
| `clsx` | Conditional class names |
| `cheerio` | Parses imported pages (JSON-LD → Open Graph → text) |
| `@anthropic-ai/sdk` | Turns an imported page into structured listing JSON (tool use) |
| `sharp` | Re-encodes imported photos to WebP + thumbnails on the server |
| `qrcode` | Generates each advertiser's QR (PNG/SVG) on demand — nothing is stored |
| `leaflet` + `react-leaflet` | Pin-picker map when a Google Maps link has no coordinates (OpenStreetMap tiles, no API key) |
| `@fontsource/ibm-plex-sans-arabic` | Self-hosted Arabic font (no runtime call to Google Fonts) |
| `server-only` | Build-time guard so server modules (service key) can't reach the browser |

## Local development

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000
```

### Environment variables

| Name | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Publishable (anon) key |
| `NEXT_PUBLIC_SITE_URL` | public | Final public URL. **QR codes encode this** — set the real domain before printing any QR |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Analytics inserts + admin operations. Never expose |
| `ANTHROPIC_API_KEY` | server only | Import-from-link extraction |
| `ANTHROPIC_MODEL` | server only | Defaults to `claude-haiku-5-5` |

## Database

Migrations live in `supabase/migrations/` and are applied in filename order:

1. `…_schema.sql` — tables, enums, constraints, PostGIS, default plans
2. `…_functions.sql` — triggers (plan limits, unit/building integrity, profile guard), RPCs (`get_advertiser_listings`, `my_plan_usage`, `my_stats`, …)
3. `…_rls.sql` — Row Level Security on every table + storage buckets/policies
4. `…_private_helpers.sql` — moves RLS helper functions out of the REST-exposed schema
5. `…_track_event.sql` — anonymous, privacy-preserving view/scan counter (no service key needed)

Key rules enforced **in the database** (not just the UI):

- One table `listings` with `kind` = `apartment | building | unit`. Units must belong to a building of the same owner and never store their own location — they inherit the building's.
- Apartments and buildings can't leave `draft` without a Google Maps link and coordinates.
- Plan limits (`plans.max_listings`, `plans.max_imports_per_day`) are checked by triggers, so changing a row in `plans` takes effect immediately with no deploy.
- Users can't change their own `role` or `is_suspended`.
- The visitor's location is only a parameter to `get_advertiser_listings` — it is never stored.

### Making someone an admin

```sql
update public.profiles set role = 'admin' where contact_email = 'someone@example.com';
```

## Supabase Auth settings

- **Site URL**: your `NEXT_PUBLIC_SITE_URL`
- **Redirect URLs**: `https://<your-domain>/auth/callback`, `http://localhost:3000/auth/callback`
- **Google provider**: enable it and add the Google OAuth client ID/secret

## Routes

| Route | Purpose |
|---|---|
| `/{locale}` | Landing |
| `/{locale}/pricing` | Plans (paid plans "coming soon") |
| `/a/{slug}` | Advertiser public page — the QR target. No locale prefix; the middleware redirects by browser language and keeps `?src=qr` |
| `/{locale}/login`, `/signup`, `/forgot-password`, `/reset-password` | Auth |
| `/auth/callback` | OAuth / email-link handler |
| `/{locale}/a/{slug}/p/{id}` | Listing detail (gallery ends with the QR slide) |
| `/api/qr/{slug}?format=png\|svg&size=…` | QR image for an advertiser |
| `/api/maps/resolve` | Resolves a Google Maps link (incl. `maps.app.goo.gl`) to coordinates — signed-in users only |
| `/{locale}/dashboard/onboarding` | Profile completion after sign-up |
| `/{locale}/dashboard`, `/dashboard/profile` | Advertiser dashboard |

## Build phases

- [x] 1 — Foundation, auth, profile, AR/EN
- [x] 2 — Listings, buildings, units, images, location
- [x] 3 — QR, public page, nearest-first, sharing
- [x] 4 — Import from link
- [x] 5 — Dashboard stats, A4 poster, plans, admin
- [ ] 6 — Polish, seed data, deploy

## Visitor location & privacy

The public page asks for location only after showing an explanation. Coordinates stay in the browser
and are used to sort with the Haversine formula client-side — they are never sent to the server or stored.
`get_advertiser_listings()` (PostGIS) is also available for server-side distance sorting if needed.

## Import from link

`/dashboard/import` → server action:

1. Validates the URL and records an `import_jobs` row (the DB trigger enforces the plan's daily limit).
2. Fetches the page with an SSRF guard (http/https only, every redirect re-checked, private/loopback/metadata IPs refused, size + time caps).
3. Reads JSON-LD, then Open Graph, then page text; if `ANTHROPIC_API_KEY` is set, Claude converts it to structured JSON (tool use). Without a key, the JSON-LD/OG heuristics are used alone.
4. Copies up to 15 photos into Storage (WebP + thumbnail) and opens the result as a **draft** for review.

Large portals (Bayut, Property Finder) run bot protection and usually refuse server-side reads; agency websites and pages with JSON-LD work best. Failures show a clear message and a link to the manual form.

## Plans & payments

- `plans` holds prices and limits (`max_listings`, `max_imports_per_day`; empty = unlimited). Admins edit them at `/admin/plans`; triggers read them live.
- Every new user gets a `subscriptions` row on the default (free) plan.
- `src/lib/payments/provider.ts` defines the `PaymentProvider` interface (checkout, portal, webhook). The default `NoopProvider` keeps payments off; `/api/billing/webhook` answers 501 until a provider is set via `PAYMENT_PROVIDER`.

## Admin

`/admin` (role `admin` only): users (suspend / change plan), all listings (hide / delete), plans (prices, limits, visibility).
