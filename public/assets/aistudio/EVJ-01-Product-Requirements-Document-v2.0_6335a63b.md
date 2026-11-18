# EV Journey — Product Requirements Document (PRD)

| | |
|---|---|
| **Doc ID** | EVJ-01 |
| **Version** | 2.0 |
| **Status** | Draft — supersedes v1.0 |
| **Author** | Gulshan Bhatia + Claude (acting as Startup CTO) |
| **Date** | 2026-06-29 |
| **Project type** | Personal / solo-founder build |
| **Constraints** | Budget-conscious (OSS-first), MVP-phased, no compromise on design/UX |

> **Why a v2.0?** v1.0 (drafted with ChatGPT) had a stack that's too heavy for a solo build, no real MVP scope (every feature labelled "MVP / P0"), an out-of-scope list that contradicts the product thesis (no offline maps for a road-trip app), and design treated as a vibe rather than a system. This document re-cuts the product as a phased, OSS-first build with the smallest possible MVP that still demonstrates the killer thesis.

---

## 0. TL;DR

EV Journey is a **journey-storytelling app for EV owners** — not a battery monitor, not another social feed. The unit of value is the **Journey**: a beautifully-recorded road trip with route, photos, charging stops, and notes, that the user can keep private or share publicly.

- **MVP (Phase 1):** *The Beautiful Journey Logger* — a single-vehicle, private journey creator with a map, timeline, photos, charging stops, and a stunning detail screen. No social. No AI. Shippable in 4-6 weeks.
- **Stack:** Expo (React Native + Web) · Supabase · MapLibre GL · Tamagui · Reanimated · Claude Haiku (later phases). Single TypeScript codebase, iOS + Android + Web from day one, OSS-first, all on free tiers.
- **Design north star:** Linear's polish + Polarsteps' storytelling + Apple Photos' chrome.

---

## 1. Product Thesis

### 1.1 Problem
EV owners currently scatter every road trip across 6 apps: vehicle app (battery), maps (route), charger app (top-up), photos (memories), social (sharing), notes (observations). The complete experience of *the trip* exists nowhere. When they want to relive it or share it, they can't.

### 1.2 Promise
One app where a road trip becomes a single, beautiful, scrollable artifact — map + timeline + photos + charging + words — that the owner can save forever or publish to the world.

### 1.3 Why now
- EV ownership is past the early-adopter curve; the road-trip use case has gone mainstream.
- Mapping stacks (MapLibre + Protomaps + Overture) finally make premium maps free.
- LLMs make "turn my notes into a story" cheap (~$0.001 per journey via Claude Haiku).

### 1.4 What this is NOT
- ❌ A battery-monitor / OEM companion app
- ❌ A charging station finder (we *log* charging, we don't *route* you to it)
- ❌ A generic travel app (we are EV-native)
- ❌ A social network competing with Instagram

### 1.5 What this IS
- ✅ A premium personal journal for EV road trips
- ✅ With a small, curated community layer that comes *after* the journaling experience is great

---

## 2. Target Users

### Primary persona — "The Weekend Trip-Taker"
- Owns an EV (Tata Nexon EV, MG ZS EV, Tesla, Mahindra XUV400, Hyundai Ioniq, etc.)
- Does 1-4 road trips per quarter (200-800 km each)
- Already takes photos and writes captions for friends/family
- Frustrated by reconstructing trips from camera roll + bank statements + memory

### Secondary persona — "The Aspiring Creator"
- EV-curious or new EV owner who follows EV YouTubers/bloggers
- Wants to publish their trips, build a small following
- Not trying to become an influencer — just enjoys sharing

### Non-users (v1)
- Fleet managers
- OEMs / dealers
- Mechanics / service centres

---

## 3. Goals & Non-Goals

### 3.1 Product goals (12-month)
1. **G1 — Activation:** ≥ 60% of installs create at least one Journey
2. **G2 — Retention:** ≥ 30% of activated users create a second Journey within 30 days
3. **G3 — Quality bar:** Crash-free sessions ≥ 99.5%, p75 cold-start < 2.5s
4. **G4 — Cost:** Run the full backend within free tiers for the first 1,000 users (< $0/mo infra)

### 3.2 Non-goals
- Becoming a charger-routing tool (PlugShare, ABRP own this)
- Live vehicle telemetry / OEM integrations
- A creator economy / monetisation
- Web admin portal — Supabase Studio is enough until 10k users

---

## 4. Scope — Phased MVP

> **Rule of thumb:** Every phase must be shippable on its own and immediately useful to a solo user. Community comes after journaling is great. AI comes after community is alive.

### Phase 0 — Foundation (1-2 weeks)
**Goal:** A user can install, sign in, set up their identity and one vehicle.

- Email + Google sign-in (Supabase Auth)
- Profile: name, handle, avatar, city
- Single-vehicle add: brand, model, variant, battery (kWh), colour, nickname, optional photo
- Settings shell: theme (light/dark/system), logout, delete account, app version
- Onboarding flow (3 screens max)

### Phase 1 — *The Beautiful Journey Logger* (4-6 weeks) — **THIS IS THE MVP DEMO**
**Goal:** A user can record one road trip end-to-end as a single beautiful artifact, kept private.

- **Create Journey:** title, dates, cover image, vehicle (auto-picked if one), start/end location (search + pin)
- **Timeline:** add events in order — photo stop, charging stop, food, hotel, scenic view, custom. Each event = timestamp + GPS + photo(s) + note + optional tags
- **Charging stops** (special event type): charger name, network, AC/DC, connector, start/end SOC, duration, cost, rating, photos
- **Map preview:** the journey's pins drawn on a MapLibre map, lightweight, no GPX yet
- **Journey detail screen** — the hero of the app: vertical scroll, cover photo full-bleed, key stats card (distance / duration / start-SOC → end-SOC / kWh added / cost), then the timeline rendered as a beautiful vertical story
- **Draft / publish** — but publish is private-only in this phase (still a useful single-user record)
- **Export as shareable card** — a single PNG of the journey summary the user can post to WhatsApp/IG/Twitter
- **Local-first storage:** every action works offline; sync happens when online

### Phase 2 — Community Lite (3-4 weeks)
**Goal:** Users can share publicly and discover each other's journeys.

- Visibility per journey: private / followers / public
- Public feed (chronological, no algorithm yet)
- Like, comment, follow, save
- Public user profile with their journey grid
- Simple search: users, destinations, vehicles

### Phase 3 — AI + Discover + Push (2-3 weeks)
**Goal:** Reduce blank-page friction for journaling, add light discovery, re-engage users.

- AI title suggestion (3 options) generated from timeline events + photos meta
- AI story draft generated from timeline events + user notes (always editable, user owns final text)
- AI hashtag/tag suggestions
- "Trending" tab: top-liked journeys this week (simple SQL view)
- Push notifications: like, comment, new follower (Expo Push, free)

### Phase 4 — Pro & Differentiators (later — not committed)
- Multi-vehicle garage with per-vehicle stats
- Route playback on map (animated polyline)
- Offline tile bundles (Protomaps PMTiles for a downloaded region)
- Video media support (Cloudflare Stream free tier or self-host)
- Charging cost dashboard / cost-per-km analytics
- Group journeys (multi-author)

### Out of scope, period (for v1.x)
- OEM telemetry / battery integration
- Trip planner / route optimisation
- Marketplace
- Premium subscription
- Native admin portal (use Supabase Studio)
- Live location sharing

---

## 5. Product Principles

1. **The Journey is the entity.** Every screen, every model, every API revolves around it.
2. **Local-first.** The user is often in a cell-dead zone. Every interaction must work offline; sync is invisible.
3. **One excellent screen beats five mediocre ones.** Phase 1 puts disproportionate craft into Journey Detail.
4. **AI assists; the user owns the words.** No auto-publish, no destination unknown.
5. **Design is engineering.** Tokens, motion, haptics, and copy are part of the spec, not polish.
6. **Privacy by default.** New journeys are private until the user explicitly publishes.
7. **OSS-first.** If we can self-host it for free, we do.
8. **Ship the smallest thing that proves the thesis.** Then earn the right to build more.

---

## 6. Technology Stack — *Open-Source-First*

| Layer | Choice | Why this over what GPT picked |
|---|---|---|
| **Cross-platform** | **Expo (React Native + Web)** | Single TS codebase → iOS + Android + Web (PWA) from day one. Flutter gives you mobile only and a second language to maintain. Expo has free EAS Build minutes, generous OTA updates, and the largest OSS ecosystem (Tamagui, Reanimated, Skia, etc.). |
| **UI system** | **Tamagui** + **react-native-reusables** (shadcn for RN) | Tamagui = compile-time optimised, themeable, dark-mode-native, works on web. shadcn-style ownership of components (copy into repo, not npm-locked). MIT. |
| **Motion** | **react-native-reanimated** + **moti** | Best-in-class native-feeling motion. OSS. Critical for the "extraordinary" UX bar. |
| **Maps** | **MapLibre GL Native** + **MapLibre GL JS** (web) | OSS Mapbox fork. Pair with free tile sources: **MapTiler free tier** (100k tile loads/mo free) or self-host **Protomaps PMTiles** on Cloudflare R2 for true zero-cost. **Replaces Google Maps SDK** (which is paid past tiny free tier — wrong for a road-trip app). |
| **Backend** | **Supabase** (free tier; self-hostable later) | One service = Postgres + Auth + Row-Level Security + Storage + Realtime + Edge Functions. Replaces NestJS + Supabase Auth + Supabase Storage + a custom server you'd otherwise have to deploy. NestJS is a non-trivial maintenance burden for a solo founder — defer unless/until we outgrow Supabase. |
| **DB** | **Postgres** (via Supabase) | Same as v1. Industry default. |
| **Local cache / offline** | **MMKV** (key-value) + **WatermelonDB** (relational) | OSS, RN-first, syncs cleanly with Postgres. Replaces Isar (Flutter-only). |
| **Object storage** | **Supabase Storage** (1 GB free) → **Cloudflare R2** when we grow (10 GB free + zero egress) | Free path that scales. |
| **Push notifications** | **Expo Push** (free) → FCM/APNs natively when we self-host | Zero setup, free for the volumes we'll hit. |
| **Analytics & errors** | **PostHog** (self-host free / cloud 1M events free) + **Sentry** (5k errors/mo free) | OSS, privacy-friendly, product analytics + session replay in one. Replaces Firebase Analytics + Crashlytics (Google-tied, less OSS). |
| **AI** | **Anthropic Claude Haiku 4.5** for title/story; option to swap to **Ollama + Llama 3.1 8B** self-hosted later | Cheapest premium model. ~$0.001 per journey story at typical lengths. Via Supabase Edge Function so API key never ships to client. |
| **CI/CD** | **GitHub Actions** + **EAS Build** | Free for solo / public repos. |
| **Hosting (web build)** | **Cloudflare Pages** or **Vercel** free tier | Static export from Expo Web. |
| **Domain + edge** | **Cloudflare** (free DNS + R2 + Pages) | Single pane, free tier covers us. |
| **Design** | **Figma** free tier + **Claude Design** for AI-driven mockups; tokens exported via **Figma Tokens** plugin → Tamagui theme | OSS-friendly workflow. |

**Total expected monthly cost for first 1,000 users: ~$0.** First paid line item will likely be Supabase Pro ($25/mo) if storage or bandwidth grows.

---

## 7. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Expo App (iOS / Android / Web — single TS codebase)        │
│   ├── UI: Tamagui + Reanimated + MapLibre                   │
│   ├── State: Zustand (UI) + TanStack Query (server)         │
│   ├── Local: MMKV (kv) + WatermelonDB (relational, offline) │
│   └── Auth: Supabase JS client                              │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS (PostgREST + Realtime + Storage SDK)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase (managed or self-hosted)                          │
│   ├── Postgres (journeys, events, vehicles, users, ...)     │
│   ├── Auth (email, Google, Apple)                           │
│   ├── Storage (photos, cover images)                        │
│   ├── Edge Functions (AI proxy, share-card render)          │
│   └── Realtime (Phase 2: live likes/comments)               │
└──────────────────┬──────────────────────────────────────────┘
                   │ server-to-server
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  External services                                          │
│   ├── Anthropic API (Claude Haiku — title/story gen)        │
│   ├── MapTiler / Protomaps (tiles)                          │
│   ├── Expo Push (notifications)                             │
│   └── Sentry + PostHog (telemetry)                          │
└─────────────────────────────────────────────────────────────┘
```

**Key decision:** No custom backend server in Phase 1-3. Everything goes via Supabase. We only spin up a backend (Hono on Cloudflare Workers, NOT NestJS) if/when we need server-side logic beyond what Edge Functions handle.

---

## 8. Domain Model (MVP slice)

```
users (id, handle, name, avatar_url, city, country, created_at)
  └── vehicles (id, user_id, brand, model, variant, battery_kwh, colour, nickname, photo_url, is_default)
        └── journeys (id, user_id, vehicle_id, title, description, cover_url,
                       start_at, end_at, start_location_text, start_geo,
                       end_location_text, end_geo, distance_km, duration_min,
                       start_soc, end_soc, kwh_added, total_cost,
                       visibility, status, created_at, published_at)
              └── timeline_events (id, journey_id, kind, sequence_idx,
                                     happened_at, geo, location_text,
                                     note, tags[], created_at)
                    ├── event_media (id, event_id, url, kind, caption, order_idx)
                    └── charging_details (event_id [FK 1:1],
                                            charger_name, network, ac_or_dc,
                                            connector_type, start_soc, end_soc,
                                            energy_kwh, duration_min, cost,
                                            rating, review)
```

`timeline_events.kind` ∈ `{ start, end, charging, food, hotel, scenic, photo, coffee, custom }`.
Phase 2 adds: `likes`, `comments`, `follows`, `saves`.

All tables: RLS policies enforce ownership + visibility. Soft delete via `deleted_at`.

---

## 9. UX Information Architecture (MVP)

```
Tabs (bottom):
  ┌──────────┬──────────┬──────────┬──────────┐
  │  Home    │  Map     │  +       │  Profile │
  │ (journeys│ (Phase 2:│ (create  │ (you +   │
  │  list)   │  feed)   │  journey)│  garage) │
  └──────────┴──────────┴──────────┴──────────┘

Onboarding (one-time):
  Welcome → Sign in → Add your first EV → Done

Home (Phase 1):
  Your journeys — vertical card list, big covers
  Empty state: "Your first road trip is waiting"

Create Journey flow:
  Sheet 1: title, dates, vehicle, cover photo
  Sheet 2 (after creation): timeline editor — add events

Journey Detail (the hero):
  Full-bleed cover → stats card → map preview → timeline scroll → share button

Profile:
  Header (avatar, name, handle, stats)
  Garage (your vehicles)
  Settings entry
```

---

## 10. Functional Requirements — Phase 1 (MVP)

> Each requirement is testable. Acceptance criteria are in Gherkin where useful.

### FR-1 Authentication
- FR-1.1 User can sign up with email + password
- FR-1.2 User can sign in with Google (OAuth via Supabase)
- FR-1.3 User can sign in with Apple (iOS only)
- FR-1.4 Forgot password sends magic link via Supabase Auth email
- FR-1.5 Session persists across app restart (Supabase Auth + secure storage)
- FR-1.6 Delete account purges all user data (cascade) within 24h

**Acceptance:**
```
Given I am a new user
When I sign up with a valid email and password
Then I receive a verification email
And after verifying, I am routed to onboarding
```

### FR-2 Profile
- FR-2.1 User edits name (1-50 chars), handle (unique, 3-20 lowercase alphanumeric + `_`), bio (≤ 160 chars), city, country
- FR-2.2 User uploads avatar (auto-cropped square, ≤ 5 MB, jpg/png/webp)
- FR-2.3 Handle uniqueness enforced server-side with friendly error

### FR-3 Vehicle (Garage)
- FR-3.1 User adds vehicle with required: brand, model, battery (kWh). Optional: variant, colour, nickname, photo
- FR-3.2 First vehicle is auto-default
- FR-3.3 Edit and delete vehicle (delete blocked if journeys reference it; suggest reassignment)
- FR-3.4 Brand/Model picker uses a seeded list of common Indian + global EVs (≈ 50 models) with custom-entry fallback

### FR-4 Journey — Create & Edit
- FR-4.1 Required to create: title, vehicle, start datetime
- FR-4.2 Optional at create: end datetime, start/end locations, cover image, description
- FR-4.3 Status defaults to `draft`; visibility defaults to `private`
- FR-4.4 User can edit any field until status = `published`. After publish, edits allowed but tracked (audit log Phase 2)
- FR-4.5 Delete journey soft-deletes; cascade removes timeline events + media on hard-delete worker

### FR-5 Timeline Events
- FR-5.1 User adds event of any supported `kind`
- FR-5.2 Every event has: kind, timestamp (defaults to `now`), optional geo (capture from device GPS), optional photo(s), optional note (≤ 500 chars), optional tags
- FR-5.3 Events display in chronological order by `happened_at`; user can reorder via drag → updates `sequence_idx`
- FR-5.4 Up to 12 photos per event, ≤ 8 MB each, auto-compressed to ≤ 1600 px long edge on upload
- FR-5.5 Charging events show extra fields (see FR-6)
- FR-5.6 Events are first stored in local DB (WatermelonDB) and sync to Supabase when online — full offline support

### FR-6 Charging Stops
- FR-6.1 Required: start SOC (0-100), end SOC (≥ start SOC), connector type (AC Type 2, CCS2, CHAdeMO, AC Type 1, Tesla, Other)
- FR-6.2 Optional: charger name, network (PlugShare-style picker + custom), AC/DC (defaults from connector), duration (auto from timestamps), energy kWh, cost (₹), rating (1-5), review note, photos
- FR-6.3 Auto-compute energy if user enters none: `energy = battery_kwh × (end_soc − start_soc) / 100`
- FR-6.4 Aggregated to journey stats: total kWh added, total charging cost, avg rating

### FR-7 Journey Detail Screen
- FR-7.1 Hero cover photo with parallax on scroll
- FR-7.2 Stats card: distance (sum of inter-event haversine if no GPX), duration, SOC start → end, kWh added, ₹ spent, vehicle name
- FR-7.3 Map preview: MapLibre static-style render with pins at each event's geo, ordered polyline connecting them
- FR-7.4 Timeline rendered as vertical story; each event = photo collage + note + kind icon + relative-time chip
- FR-7.5 Footer actions: share-as-card, edit, delete

### FR-8 Share-as-Card Export
- FR-8.1 Generate a single 1080 × 1920 PNG containing: app logo, journey title, cover photo, key stats, small map, "made with EV Journey"
- FR-8.2 Rendered via Skia (client) or Supabase Edge Function (server fallback)
- FR-8.3 Share sheet uses native OS share

### FR-9 Settings
- FR-9.1 Theme: light / dark / system (default system)
- FR-9.2 Account: sign out, delete account (2-step confirm)
- FR-9.3 About: version, privacy policy URL, terms URL, OSS credits

### FR-10 Telemetry & Errors
- FR-10.1 PostHog events: `app_open`, `signup_completed`, `vehicle_added`, `journey_created`, `journey_published`, `event_added`, `charging_logged`, `share_card_exported`
- FR-10.2 Sentry captures all crashes with breadcrumbs

---

## 11. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Cold start (p75, mid-range Android) | < 2.5 s |
| NFR-2 | Time-to-interactive on Home (p75) | < 1.5 s |
| NFR-3 | Image upload p75 (1 photo, 4G) | < 6 s |
| NFR-4 | Offline tolerance | Create + edit journeys fully offline; sync on reconnect |
| NFR-5 | Crash-free sessions | ≥ 99.5% |
| NFR-6 | Accessibility | WCAG 2.1 AA: text contrast, hit targets ≥ 44pt, dynamic type, screen-reader labels |
| NFR-7 | Privacy | Private by default; explicit publish; full data export (Phase 3+) |
| NFR-8 | Security | Supabase RLS on every table; no service-role key on client; CSP on web build |
| NFR-9 | i18n | English only in MVP; copy externalised in `i18n/en.json` for easy Hindi/regional add later |
| NFR-10 | Bundle size | iOS IPA < 60 MB, Android AAB < 40 MB |

---

## 12. Design System — Concrete, Not Vibes

### 12.1 Brand
- **Name:** EV Journey
- **Tagline:** *Every drive. Every charge. Every memory.*
- **Voice:** Calm, confident, premium. Closer to *Linear* or *Apple* than *Notion*'s playfulness.

### 12.2 Tokens (Tamagui theme)
```
Colors (light):
  bg          #FAFAFA
  surface     #FFFFFF
  surface2    #F4F4F5
  border      #E4E4E7
  text        #18181B
  text-muted  #71717A
  primary     #0EA5A2  (deep teal — "electric current")
  primary-bg  #E6FFFB
  accent      #F59E0B  (sunset amber — for journey highlights)
  success     #10B981
  warning     #F59E0B
  danger      #EF4444

Colors (dark):
  bg          #0A0A0A
  surface     #111113
  surface2    #18181B
  border      #27272A
  text        #FAFAFA
  text-muted  #A1A1AA
  primary     #2DD4BF
  primary-bg  #052E2C
  accent      #FBBF24

Typography:
  Display:    Instrument Serif (cover photos, journey titles)  - OSS
  Heading:    Inter Tight                                      - OSS
  Body:       Inter                                            - OSS
  Mono:       JetBrains Mono (stats numerals)                  - OSS

Type scale (px): 12, 14, 16, 18, 20, 24, 30, 36, 48, 64
Line heights: tight 1.1, normal 1.4, relaxed 1.6

Spacing (px): 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96
Radii (px): 4, 8, 12, 16, 24, 999

Shadows:
  sm:  0 1px 2px rgba(0,0,0,0.06)
  md:  0 4px 12px rgba(0,0,0,0.08)
  lg:  0 12px 32px rgba(0,0,0,0.12)
  xl:  0 24px 64px rgba(0,0,0,0.16)  (used on journey hero only)
```

### 12.3 Motion principles
- **All durations:** 150ms (micro), 300ms (standard), 500ms (hero). Easing default `cubic-bezier(0.22, 1, 0.36, 1)` (out-quint).
- **Press feedback:** scale 0.97, haptic light, 80ms in / 200ms out.
- **Hero photo:** parallax on scroll (translateY by 0.4× scroll delta).
- **List items:** stagger entrance, 40ms between.
- **Map pins:** drop with spring, 1 by 1, 60ms apart.
- **Tab transitions:** crossfade + 8px slide up.
- **AI generation (Phase 3):** shimmer text reveal, char by char.

### 12.4 Component primitives (Phase 1)
- `Button` (filled / outline / ghost, sm / md / lg)
- `Card` (default / elevated / interactive)
- `Input`, `Textarea`, `Select`, `DatePicker`, `LocationPicker`
- `Avatar`, `Chip`, `Tag`, `Pill`
- `Sheet` (bottom sheet, used heavily for create flows)
- `MapView` (MapLibre wrapper with EV Journey style)
- `TimelineRail` (vertical track + nodes — custom, this is the signature widget)
- `StatTile` (number + label, with tabular-nums)
- `EmptyState`, `Skeleton`, `Toast`

### 12.5 Reference bar
- **Polarsteps** — for trip rendering & map storytelling
- **Linear** — for chrome polish, command-K feel, dark mode
- **Apple Photos** — for cover photo treatment & parallax
- **Strava** — for stats card and activity feed cards
- **Arc Browser** — for unexpected delight in mundane interactions

---

## 13. API Surface (Phase 1, via Supabase PostgREST)

```
GET    /rest/v1/me
GET    /rest/v1/vehicles            (RLS: user_id = auth.uid())
POST   /rest/v1/vehicles
PATCH  /rest/v1/vehicles?id=eq.X
DELETE /rest/v1/vehicles?id=eq.X

GET    /rest/v1/journeys            (RLS: owner OR visibility=public)
POST   /rest/v1/journeys
PATCH  /rest/v1/journeys?id=eq.X
DELETE /rest/v1/journeys?id=eq.X

GET    /rest/v1/timeline_events?journey_id=eq.X
POST   /rest/v1/timeline_events
PATCH  /rest/v1/timeline_events?id=eq.X
DELETE /rest/v1/timeline_events?id=eq.X

POST   /storage/v1/object/photos/{path}   (multipart upload)
GET    /storage/v1/object/public/photos/{path}

// Edge Functions (Phase 3+)
POST   /functions/v1/generate-journey-title
POST   /functions/v1/generate-journey-story
POST   /functions/v1/render-share-card
```

---

## 14. Release Plan & Milestones

| Phase | Weeks | Outcome | "Done when" |
|---|---|---|---|
| 0 — Foundation | 1-2 | Auth + Profile + Garage shell | I can sign in, set up identity, add one vehicle on iOS / Android / Web |
| 1 — Journey Logger | 3-8 | MVP shippable | I can record my next road trip end-to-end and show the detail screen to a friend who says "whoa" |
| 2 — Community Lite | 9-12 | Public alpha | 50 invited beta users can follow + like + comment |
| 3 — AI + Discover | 13-15 | Public beta launch | AI title/story works on 90% of journeys without edits; push notifications live |
| 4 — Pro features | 16+ | Roadmap-driven | Prioritised post-beta feedback |

---

## 15. Success Metrics

| Phase | Metric | Target |
|---|---|---|
| 1 | Onboarding completion | ≥ 80% |
| 1 | First journey created within 7 days | ≥ 60% |
| 1 | Journeys per active user / month | ≥ 1.2 |
| 1 | Average events per journey | ≥ 4 |
| 1 | Crash-free sessions | ≥ 99.5% |
| 2 | DAU/MAU | ≥ 20% |
| 2 | Public journey rate | ≥ 30% |
| 3 | AI title acceptance (not edited) | ≥ 40% |
| 3 | AI story used as final | ≥ 25% |
| 3 | D30 retention | ≥ 25% |

---

## 16. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Map tile costs scale faster than free tier | Med | Med | Self-host Protomaps PMTiles on R2 (free egress) |
| Photo storage blows free tier | High at scale | Med | Aggressive compression; R2 over Supabase storage at 500 MB |
| Expo Web feature parity gaps (MapLibre, haptics) | Med | Low | Web is enhancement, not primary platform — gate by `Platform.OS` |
| Supabase RLS misconfig leaks data | Low | High | RLS tests in CI; default-deny policies; security review before public launch |
| AI generation costs balloon | Low | Low | Haiku is cheap (~$0.001/journey); cap monthly spend; show cost in admin |
| Solo-founder burnout / scope creep | High | High | Stick to the phase plan; say no to anything not in current phase |

---

## 17. What v1.0 of this doc got wrong (changelog)

- **Stack consolidated:** Flutter + NestJS → Expo + Supabase. -1 language, -1 deploy target, -1 maintenance burden.
- **Maps fixed:** Google Maps SDK → MapLibre + Protomaps/MapTiler. Saves a billable surface on the road-trip use case.
- **MVP shrunk:** 11 modules → 5 in Phase 1 (auth, profile, garage, journey, settings). Community, AI, discover, notifications all deferred.
- **Offline added back to MVP.** Critical for road trips.
- **Design system specified:** tokens, fonts, motion principles. Was previously a mood.
- **AI scoped concretely:** model named (Haiku), proxy pattern, cost ceiling.
- **Out-of-scope re-cut:** What's actually unbuildable in 16 weeks vs what's just later.
- **Cost target stated:** ≤ $0/mo until 1k users.

---

## 18. Next Documents (when needed, not before)

- **EVJ-02 — Screen Specifications** (after design prototype)
- **EVJ-03 — Database & RLS Schema** (before backend cut)
- **EVJ-04 — Claude Code Implementation Guide** (per phase)
- **EVJ-05 — Test Plan** (before public beta)

---

*End of PRD v2.0. This document is the single source of truth until superseded.*
