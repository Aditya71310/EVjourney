# EV Journey — Implementation & Deployment Plan (Phase 0 → Phase 2)

| | |
|---|---|
| **Doc ID** | EVJ-03 |
| **Version** | 1.0 |
| **Status** | Living document — update as you build |
| **Stack** | Next.js 15 · Supabase · Tailwind v4 · shadcn/ui · MapLibre · Vercel |
| **Build mode** | Solo · AI-assisted (Claude Code / Cursor) |
| **Target spend** | $0 / month for first 1,000 users |
| **Total build time** | ~12 weeks part-time, ~6-8 weeks full-time |

> **How to read this doc:** Sections 1-3 are setup. Sections 4-7 are the actual build, week-by-week. Each task has a *"Claude Code prompt"* line you can paste verbatim. Sections 8-11 are deployment + ops.

---

## 0. TL;DR

- **Phase 0 (Weeks 1-2):** Next.js project online, auth working, you can sign in and add a vehicle on your phone.
- **Phase 1 (Weeks 3-8):** You can record a real road trip end-to-end as a private journey. **This is your launchable demo.**
- **Phase 2 (Weeks 9-12):** Public journeys, follow, like, comment, search. Public beta opens.
- **Total infra cost for 1,000 users:** $0. First paid line item is Supabase Pro at $25/mo, not before user 5,000.

---

## 1. Lock-in: the stack you'll build with

| Layer | Tech | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | RSC, SSR for shareable journey URLs, single TS codebase, Vercel-native |
| UI primitives | **shadcn/ui** + **Radix** | Copy-into-repo components, full ownership, accessible defaults |
| Styling | **Tailwind CSS v4** | Same utility model Claude Design used — design choices port directly |
| Motion | **Framer Motion** (`motion` package) | Hero parallax, view transitions, list staggers |
| Maps | **MapLibre GL JS** | OSS Mapbox fork |
| Tiles | **MapTiler** free tier (100k loads/mo) | Free for the first 1k users; switch to self-hosted Protomaps if it caps |
| Auth + DB + Storage | **Supabase** (managed, free tier) | One service, Postgres + Auth + Storage + RLS + Edge Functions |
| ORM | **Drizzle** | Type-safe SQL, zero runtime overhead |
| State (UI) | **Zustand** | 3 KB, no boilerplate |
| State (server) | **TanStack Query** | Cache, optimistic updates, offline sync |
| Local DB | **Dexie.js** (IndexedDB) | Offline journey creation in cell-dead zones |
| Service worker / PWA | **Serwist** | Install prompt, offline shell, background sync |
| Image handling | **next/image** + **browser-image-compression** (client) | Auto WebP + client-side downsize before upload |
| Forms | **React Hook Form** + **Zod** | Schema-first validation |
| AI (Phase 3+) | **Anthropic Claude Haiku 4.5** via Supabase Edge Function | Cheap (~$0.001/journey), no key on client |
| Errors | **Sentry** (5k errors/mo free) | Crash reporting |
| Product analytics | **PostHog Cloud** (1M events/mo free) | Funnels, session replay |
| Hosting | **Vercel** (Hobby, free) | Auto-deploy on git push, edge functions, image optimization |
| Domain + edge | **Cloudflare** (free) | DNS, optional R2 for media when Supabase Storage caps |
| Repo + CI | **GitHub** (private free) + **GitHub Actions** | Free for solo |

**Total cost** at every line: **$0** until you have real scale.

---

## 2. Project conventions (set once, save dozens of hours later)

```
apps/
  web/                          # Next.js app
    app/
      (auth)/                   # auth-required routes
        layout.tsx              # checks session, redirects to /sign-in
        journeys/
        garage/
        settings/
      (public)/                 # public routes (journey share, profile)
        j/[slug]/page.tsx       # public journey detail (SSR + OG card)
        u/[handle]/page.tsx     # public profile
        sign-in/
      api/
        ai/
          generate-title/route.ts   # Phase 3
        share-card/route.ts          # Satori-rendered OG image
    components/
      ui/                       # shadcn primitives (button, sheet, dialog…)
      journey/                  # journey-specific composites
      timeline/                 # timeline rail + event card
      map/                      # MapLibre wrapper
      garage/
    lib/
      supabase/                 # client + server-only helpers
      db/                       # drizzle schema + queries
      offline/                  # dexie schemas, sync engine
      hooks/
      utils/
    styles/
      globals.css
      tokens.css                # design tokens as CSS vars
packages/
  shared/                       # zod schemas shared client+server (later, not for MVP)
supabase/
  migrations/                   # SQL migrations
  functions/                    # edge functions (deno)
.env.example
```

**Naming rules**
- Components: `PascalCase` (`JourneyHero.tsx`)
- Hooks: `useFooBar.ts`
- Server actions: `actions.ts` co-located with route
- Database tables: `snake_case` plural (`journeys`, `timeline_events`)
- API paths: kebab-case (`/api/share-card`)

**Commit rules**
- Conventional commits: `feat(garage): add vehicle picker`
- Branches per feature: `feat/garage-add-vehicle`
- Squash-merge to `main`; Vercel auto-deploys on every push

---

## 3. Day 0 setup — before you build anything

These take ~90 minutes total. Do them in order.

### 3.1 Accounts you need (all free)
- [ ] **GitHub** account → create private repo `ev-journey`
- [ ] **Vercel** account, connect to GitHub repo
- [ ] **Supabase** project → name `ev-journey-prod`. Save URL + anon key + service-role key
- [ ] **MapTiler** account → get API key (free tier)
- [ ] **Sentry** project (Next.js platform) → DSN
- [ ] **PostHog Cloud** project → API key
- [ ] **Cloudflare** account → register `evjourney.app` or similar (₹600-1500/yr for the domain — only paid line item in Phase 0-1)
- [ ] **Apple Developer** + **Google Cloud** — only if you want native Sign in with Apple / Google as Phase 0. For MVP, magic-link email is enough; skip these until Phase 1 polish.

### 3.2 Local environment
- [ ] Node 22 LTS via `nvm`
- [ ] pnpm 9.x (`npm i -g pnpm`)
- [ ] VS Code + Cursor (or Claude Code CLI)
- [ ] Install Supabase CLI: `brew install supabase/tap/supabase`
- [ ] `supabase init` in repo root for local dev DB

### 3.3 Project bootstrap
```bash
pnpm create next-app@latest ev-journey \
  --typescript --tailwind --app --src-dir=false --use-pnpm

cd ev-journey
pnpm add @supabase/supabase-js @supabase/ssr drizzle-orm postgres
pnpm add -D drizzle-kit
pnpm add zustand @tanstack/react-query
pnpm add framer-motion lucide-react
pnpm add react-hook-form zod @hookform/resolvers
pnpm add maplibre-gl
pnpm add dexie dexie-react-hooks
pnpm add @serwist/next serwist
pnpm add browser-image-compression
pnpm add @sentry/nextjs posthog-js
pnpm dlx shadcn@latest init  # then add: button card sheet dialog input textarea label select
```

### 3.4 Design tokens import
Copy these into `app/styles/tokens.css` exactly — they match the prototype.

```css
@layer base {
  :root {
    --bg: #0A0A0A;          --surface: #141417;       --surface-2: #1E1E22;
    --border: #2E2E33;       --text: #FAFAFA;          --text-muted: #A1A1AA;
    --primary: #2DD4BF;      --primary-bg: #0D2E2A;    --primary-fg: #062322;
    --accent: #FBBF24;       --danger: #F87171;
  }
  [data-theme="light"] {
    --bg: #FAFAFA;           --surface: #FFFFFF;       --surface-2: #F1F1F3;
    --border: #D4D4D8;       --text: #18181B;          --text-muted: #52525B;
    --primary: #0EA5A2;      --primary-bg: #D7FBF6;    --primary-fg: #FFFFFF;
    --accent: #B45309;       --danger: #DC2626;
  }
}
```

Wire fonts in `app/layout.tsx`: `Instrument_Serif`, `Inter`, `JetBrains_Mono` from `next/font/google`.

---

## 4. Phase 0 — Foundation (Weeks 1-2)

**Goal:** A user can install (or open the URL), sign in with email, set up identity, and add one vehicle. Theme switch works. PWA installable.

### 4.1 Database schema (Week 1, Day 1)

Migration `supabase/migrations/0001_init.sql`:

```sql
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,20}$'),
  name text not null,
  avatar_url text,
  bio text check (length(bio) <= 160),
  city text,
  country text,
  created_at timestamptz default now()
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  brand text not null,
  model text not null,
  variant text,
  battery_kwh numeric not null check (battery_kwh > 0),
  colour text,
  nickname text,
  photo_url text,
  is_default boolean default false,
  created_at timestamptz default now()
);
create index idx_vehicles_user on vehicles(user_id);

-- RLS
alter table users enable row level security;
alter table vehicles enable row level security;

create policy "users: read own" on users for select using (auth.uid() = id);
create policy "users: read public profiles" on users for select using (true);
create policy "users: update own" on users for update using (auth.uid() = id);
create policy "users: insert own" on users for insert with check (auth.uid() = id);

create policy "vehicles: full own" on vehicles for all using (auth.uid() = user_id);
```

**Claude Code prompt:** *"Create the Drizzle schema in `lib/db/schema.ts` matching `supabase/migrations/0001_init.sql`. Add zod schemas in `lib/db/zod.ts` derived from drizzle-zod. Don't add CRUD functions yet."*

### 4.2 Auth + middleware (Week 1, Days 2-3)

- [ ] Set up `@supabase/ssr` server + browser clients
- [ ] Middleware in `middleware.ts` refreshing session on every request
- [ ] `(auth)/layout.tsx` redirects to `/sign-in` if no session
- [ ] Sign-in page: magic-link email only for MVP (add Google in Phase 1 polish)
- [ ] After sign-in, redirect to `/onboarding/handle` if user row doesn't exist

**Claude Code prompt:** *"Implement Supabase magic-link auth for Next.js 15 App Router. Three files: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `middleware.ts`. Use the official @supabase/ssr pattern. Redirect signed-out users from any `(auth)` route to `/sign-in`. After successful sign-in, check if a row exists in `users` table — if not, redirect to `/onboarding/handle`."*

### 4.3 Onboarding flow (Week 1, Days 4-5)

Two-step:
- [ ] **Step 1 — Handle**: `/onboarding/handle` — input + name + city, server action inserts into `users`
- [ ] **Step 2 — Vehicle**: `/onboarding/vehicle` — brand picker (seed 50 EVs in `data/ev-models.json`), model, battery kWh, colour, optional photo & nickname
- [ ] On done → redirect to `/journeys` (empty state from the prototype)

### 4.4 Profile + settings shell (Week 2, Days 1-3)

- [ ] `/profile` — read-only view of self (matches Profile screen in prototype)
- [ ] `/profile/edit` — sheet to update name/bio/city/avatar
- [ ] `/settings` — theme toggle (uses `next-themes`), sign-out, delete-account flow (2-step confirm calling `auth.admin.deleteUser` via edge function)

### 4.5 PWA shell (Week 2, Days 4-5)

- [ ] `manifest.json` with icons (generate 192 / 256 / 512 PNGs from a single 1024 PNG using https://realfavicongenerator.net)
- [ ] Serwist service worker registered in root layout
- [ ] Custom install-prompt component (the Install screen from the prototype)
- [ ] iOS A2HS instructions modal for Safari

**Phase 0 done when:**
- [ ] You install the PWA on your phone from your real domain
- [ ] You sign in with magic link
- [ ] You add a Tata Nexon EV to your garage
- [ ] You switch to light theme and back
- [ ] Deploy is auto-running on every push to main
- [ ] Sentry catches a forced error successfully
- [ ] PostHog records `app_open` and `vehicle_added`

---

## 5. Phase 1 — The Beautiful Journey Logger (Weeks 3-8)

**Goal:** You can record one road trip end-to-end as a single artifact, kept private. The journey detail screen should make someone go *"whoa"*.

### Week 3 — Journey model + create flow

- [ ] Migration `0002_journeys.sql`: `journeys`, `timeline_events`, `event_media`, `charging_details` tables (full schema in PRD §8). All RLS policies default-deny except owner.
- [ ] `/journeys` route with empty/list state
- [ ] **Create Journey** sheet (matches prototype): title, dates, vehicle picker, cover photo upload
- [ ] Server action `createJourney` validates with zod, inserts, redirects to `/j/[id]/edit`
- [ ] Cover photo: upload to Supabase Storage `journeys/` bucket, return `public_url`, save to row

**Claude Code prompt:** *"Build the journey creation flow. Server action in `app/journeys/actions.ts` named `createJourney(input)`. Use the zod schema from `lib/db/zod.ts`. Upload cover photo to Supabase Storage at `journeys/{user_id}/{journey_id}.jpg`, run through `browser-image-compression` client-side first (1600px long edge, 0.7 quality). Return the created journey row."*

### Week 4 — Timeline events

- [ ] Add Event sheet (matches prototype): kind chips, photo upload (multi), note, GPS capture (`navigator.geolocation`)
- [ ] List + reorder of events (drag with `framer-motion` Reorder)
- [ ] Delete event (long-press → confirm)
- [ ] All writes go through Dexie first → background sync to Supabase

### Week 5 — Charging stops + SOC arc

- [ ] Specialised form fields for `kind = 'charging'`: connector select, start/end SOC sliders, cost, rating, review
- [ ] Auto-compute energy if blank: `battery_kwh × (end - start) / 100`
- [ ] **SOC arc** component (SVG, animates fill on input change) — copy from prototype
- [ ] Aggregate trip stats: total kWh added, total cost, avg rating

### Week 6 — Journey detail screen (the hero)

This is the screen that justifies the app. Spend 30% of total dev time here.

- [ ] Full-bleed cover with scroll-driven parallax (`framer-motion`'s `useScroll` + `useTransform`)
- [ ] Hero overlay: dates, italic serif title, vehicle/visibility chips
- [ ] **Glass stats card** hanging over hero with 6 stats, animated count-up on mount
- [ ] MapLibre embed with route polyline + pins
- [ ] Vertical timeline rail (same as prototype)
- [ ] Footer action bar: Share / Edit / Visibility

**Claude Code prompt:** *"Build `/j/[id]/page.tsx` for the journey detail screen. Match `EVJ-Prototype-v2.html` (screen 4) pixel-for-pixel. Use MapLibre GL JS for the map, MapTiler style `streets-v2-dark` with API key from `process.env.NEXT_PUBLIC_MAPTILER_KEY`. Plot the journey's timeline_events as numbered pins, draw a polyline through them in order. Cover photo gets a `useScroll` parallax (translateY by 0.4× scroll delta) using framer-motion."*

### Week 7 — Share card export + offline

- [ ] **Share card** at `/api/share-card?id=xxx` rendered via **Satori** + Resvg (Vercel OSS) — outputs 1080×1920 PNG
- [ ] OG meta tags on `/j/[slug]` so WhatsApp/Twitter previews look gorgeous
- [ ] **Offline sync engine** (`lib/offline/sync.ts`): on online event, push Dexie pending writes to Supabase in order, mark as synced
- [ ] Pull latest server state on reconnect using TanStack Query stale-while-revalidate

### Week 8 — Polish + private beta

- [ ] Error boundaries on every route
- [ ] Loading skeletons (matching prototype empty states)
- [ ] Performance audit: Lighthouse mobile score ≥ 90, LCP ≤ 2.5s
- [ ] Add Google Sign-In as a second auth option (Supabase OAuth provider)
- [ ] Push to 5 friends with EVs. Watch them use it without your help.

**Phase 1 done when:**
- [ ] You can record a real weekend trip end-to-end
- [ ] You can scroll your journey detail page in front of a stranger and they ask *"what app is this?"*
- [ ] All actions work offline; sync is invisible on reconnect
- [ ] Share card renders cleanly when you paste a journey URL into WhatsApp
- [ ] Crash-free sessions ≥ 99% over a 7-day private beta
- [ ] You haven't paid anything yet

---

## 6. Phase 2 — Community Lite (Weeks 9-12)

**Goal:** Public journeys, follow, like, comment, search. Open public beta.

### Week 9 — Visibility + public routes

- [ ] Migration `0003_social.sql`: `follows`, `journey_likes`, `journey_comments`, `journey_saves`
- [ ] Update RLS on `journeys` to allow public reads when `visibility = 'public'`
- [ ] Visibility selector sheet (matches prototype screen 10)
- [ ] Public journey route `/j/[slug]` (`slug` = nanoid + dash-title for SEO), SSR for OG cards
- [ ] Public profile route `/u/[handle]` (matches prototype screen 13)

### Week 10 — Feed + like + comment

- [ ] Discover tab at `/discover` — chronological feed of public journeys (matches prototype screen 11)
- [ ] Like button with optimistic update (TanStack Query)
- [ ] Comments sheet (matches prototype screen 12), one-level reply threading
- [ ] Comment composer with mention parsing (`@handle` → link)

### Week 11 — Follow + search + notifications

- [ ] Follow / unfollow button on public profile
- [ ] Followers/Following lists (prototype screen 15)
- [ ] **Search** (`/search`) using Postgres full-text on `journeys.title || journeys.description` + `users.handle || users.name`
- [ ] In-app notifications: simple poll-on-open `notifications` table for likes/comments/follows
- [ ] Web Push for installed PWAs (works on iOS 16.4+ after Add to Home Screen)

### Week 12 — Polish + public beta launch

- [ ] Onboarding tour highlighting public/private toggle
- [ ] Report abuse / block user (basic — table `user_blocks`)
- [ ] Public landing page at `/` for unauth visitors (sells the app)
- [ ] Submit to Product Hunt / r/IndianEVs / EV forums
- [ ] Set up @evjourney social accounts to engage with first users

**Phase 2 done when:**
- [ ] 50+ public beta signups
- [ ] Three of your journeys have public likes from people you don't know
- [ ] A creator with > 100 followers in real life has shared an EV Journey link

---

## 7. How to use Claude Code / Cursor effectively

This is a personal AI-built project — your speed depends on prompt quality.

### 7.1 Per-task prompt template

```
Context: I'm building EV Journey, a mobile PWA for EV road-trip logging.
Stack: Next.js 15 App Router · TS · Supabase · Drizzle · Tailwind · shadcn/ui · Framer Motion · MapLibre.
Visual reference: EVJ-Prototype-v2.html screen [N].
Schema: see lib/db/schema.ts.

Task: [one sentence — what to build]

Acceptance:
- [bullet] file paths to create / modify
- [bullet] what should work
- [bullet] anything to NOT do

Output: code only, no explanation.
```

### 7.2 Repo conventions to give the agent

Add a `CLAUDE.md` at repo root with:
- The token list
- "Always use server actions, not API routes, unless explicitly told"
- "Always use shadcn/ui primitives before installing new libraries"
- "Reject any code that hits Supabase without an RLS check"
- Link to PRD v2 + Prototype v2 + this doc

### 7.3 Anti-patterns to refuse

- ❌ Long migration files with multiple changes — one logical change per migration
- ❌ Inline color values — always use CSS custom properties
- ❌ `'use client'` everywhere — server components by default
- ❌ Skipping zod validation on server actions
- ❌ Letting AI invent EV model names — feed it the seed JSON

---

## 8. Deployment topology

```
                           ┌──────────────────────────┐
   user.evjourney.app ─────┤  Cloudflare DNS + edge   │
                           │  · proxies to Vercel     │
                           │  · free SSL              │
                           └──────────┬───────────────┘
                                      │
                           ┌──────────▼───────────────┐
                           │  Vercel (Hobby tier)     │
                           │  · Next.js 15 SSR + RSC  │
                           │  · auto-deploy from main │
                           │  · preview per PR        │
                           │  · /api routes           │
                           │  · OG image rendering    │
                           └──────────┬───────────────┘
                                      │
              ┌───────────────────────┼────────────────────────┐
              │                       │                        │
   ┌──────────▼─────────┐  ┌──────────▼─────────┐  ┌──────────▼─────────┐
   │  Supabase (free)   │  │  MapTiler (free)   │  │  Anthropic API     │
   │  · Postgres        │  │  · vector tiles    │  │  · Claude Haiku    │
   │  · Auth + RLS      │  │  · 100k loads/mo   │  │  · Phase 3+        │
   │  · Storage 1 GB    │  └────────────────────┘  └────────────────────┘
   │  · Edge Functions  │
   └────────────────────┘

   Observability:  Sentry (errors) + PostHog (product analytics)
```

---

## 9. Step-by-step deployment (first push to prod)

### 9.1 Initial deploy (do this in Day 0)
```bash
# 1. Create repo, push initial Next.js scaffold
gh repo create ev-journey --private --source=. --push

# 2. Connect Vercel
# (Vercel UI: Add New → Project → Import ev-journey)

# 3. Add env vars in Vercel dashboard
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...               # server-only
NEXT_PUBLIC_MAPTILER_KEY=...
NEXT_PUBLIC_POSTHOG_KEY=...
SENTRY_AUTH_TOKEN=...                          # server-only
ANTHROPIC_API_KEY=sk-...                       # server-only, Phase 3
```

### 9.2 Custom domain
1. Buy `evjourney.app` (or `.in`) on Cloudflare Registrar (~₹1000/yr)
2. Vercel → Project → Domains → Add `evjourney.app` and `www.evjourney.app`
3. Cloudflare → DNS → set CNAME for `www` to `cname.vercel-dns.com`, root via Vercel's nameservers OR ALIAS-flattening
4. SSL auto-provisions in ~2 minutes

### 9.3 Database migrations
```bash
# Local dev
supabase start
# Edit migrations under supabase/migrations/
supabase db reset                # apply locally

# Prod
supabase link --project-ref xxx  # one-time
supabase db push                 # apply pending migrations to prod
```

Wire migrations into CI: a GitHub Action runs `supabase db push` on every merge to `main`. Template provided in §10.

### 9.4 Preview deploys for safety
Every PR gets its own preview URL with its own database branch. Test changes against a real environment before merging. Vercel + Supabase branching makes this free.

---

## 10. CI/CD — minimal GitHub Actions

`.github/workflows/checks.yml`:
```yaml
name: checks
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test           # Vitest unit tests
```

`.github/workflows/db-push.yml`:
```yaml
name: supabase-migrations
on:
  push:
    branches: [main]
    paths: ['supabase/migrations/**']
jobs:
  push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }} --password ${{ secrets.SUPABASE_DB_PASSWORD }}
      - run: supabase db push
```

Vercel auto-deploys on every push to `main` — no extra workflow needed.

---

## 11. Free-tier budget — when each line item breaks

| Service | Free until | What costs after |
|---|---|---|
| Vercel Hobby | 100 GB bandwidth, 100 GB-hrs serverless / mo | Pro at $20/mo when you cross |
| Supabase free | 500 MB DB, 1 GB storage, 50k MAU, 5 GB egress | Pro at $25/mo |
| MapTiler free | 100k tile loads / mo | $50/mo for 250k, or self-host Protomaps for free |
| Sentry free | 5k errors, 50 replays / mo | Team at $26/mo |
| PostHog free | 1M events, 5k replays / mo | $0.31 per 1k events after |
| Anthropic | N/A — pay-per-use | Haiku 4.5 ~$0.001 per journey story generation |
| Cloudflare DNS / R2 | DNS free forever, R2 10 GB + 0 egress | $0.015 per GB above 10 |
| Domain | ~₹1000/yr | Renewal yearly |

**Forecast:** Year 1, ~1,000 users, ~$0/mo infra. You'll only pay for the domain. First paid SaaS likely at 5k-10k users.

---

## 12. Risk register & mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Solo burnout | Most personal projects die here, not in tech | Stick to phase plan. Ship Phase 1 in <8 weeks. Don't start Phase 2 until 10 friends use Phase 1. |
| Photo storage blows free tier | Roadtrip apps are media-heavy | Aggressive client-side compression (1600px / 0.7q). Move from Supabase Storage to Cloudflare R2 at 500 MB. |
| Map tile costs spike | First flag of unexpected billing | Self-host Protomaps PMTiles on R2 (zero egress) before scale. Have the migration documented. |
| Supabase RLS bug leaks data | Catastrophic for trust | RLS test suite in CI: programmatically attempt unauthorized reads/writes on every PR. Add the suite in Phase 1, Week 7. |
| Web Push silently broken on iOS | 50% of users won't get notifications | A2HS coach card in install screen, test on physical iOS device every release. |
| AI generation $$$ surprise (Phase 3+) | Bad prompts can 10× costs | Per-user daily cap (e.g. 3 AI generations / user / day) enforced in edge function. Monitor in PostHog. |
| Vercel function timeout | Share-card render is slow | Cache share cards by `journey_id` + `updated_at`. Generate once, serve from CDN. |

---

## 13. Launch checklist (the week before public beta)

- [ ] Custom domain live, SSL green
- [ ] All env vars set in Vercel
- [ ] RLS test suite green
- [ ] Lighthouse mobile: Perf ≥ 90, A11y ≥ 95, PWA installable ≥ 100
- [ ] Sentry alert configured for `error.level >= warning`
- [ ] PostHog funnels created: `signup → first_journey → first_publish`
- [ ] Privacy policy + ToS pages at `/legal/privacy`, `/legal/terms` (use a template, attribute it)
- [ ] Public landing page at `/` for unauth users
- [ ] OG image / Twitter card on landing page
- [ ] Created @evjourney on Instagram + X — handle reserved even if dormant
- [ ] 5-10 seed public journeys created by you so first visitors don't see an empty Discover

---

## 14. What this doc deliberately does NOT cover (and where it lives)

- Detailed screen-by-screen spec — see `EVJ-Prototype-v2.html`
- Product strategy / phase rationale — see `EVJ-01-PRD-v2.0.md`
- Reusable design prompt for future variants — see `EVJ-02-Claude-Design-Master-Prompt-v1.1.md`
- AI feature deep-dive (Phase 3) — to be `EVJ-04` when you're ready
- Native app via Capacitor — to be `EVJ-05` when there's user demand

---

*End of EVJ-03 Implementation & Deployment Plan v1.0. This is a living document — update as decisions land.*
