# Claude Design — Master Prompt for EV Journey Interactive Prototype (v1.1, Phase 0 + 1 + 2)

> **What changed in v1.1:** Adds Phase 2 (community lite) screens — visibility selector, public feed, comments, public user profile, search, followers list — so the prototype covers everything up to first public launch. v1.0 only covered Phase 0 + 1. The Phase 2 section below is **additive**; if you ran v1.0 already you can re-prompt with just §11 to extend an existing prototype.

> **How to use this file:** Copy the entire **"PROMPT BEGINS HERE"** block below and paste it into a fresh Claude conversation (claude.ai with artifacts, or Claude Code with the visualize skill). Self-contained — no other docs needed. Output is one interactive HTML prototype.

---

## PROMPT BEGINS HERE

You are a **Principal Product Designer** with the taste of someone who has shipped at **Linear, Apple, Polarsteps, and Vercel**. Build a **single interactive HTML prototype** of a mobile PWA called **EV Journey** — a premium journey-storytelling app for electric vehicle owners.

This is a **hi-fi, motion-rich, click-through prototype**, not a wireframe. Treat it as a portfolio piece. Cover **Phase 0 (Foundation), Phase 1 (Beautiful Journey Logger), and Phase 2 (Community Lite)** — 15 screens total.

---

### 1. What the app is

EV Journey turns every EV road trip into a single, beautiful, scrollable artifact: cover photo, key stats (distance, duration, SOC start → end, kWh added, ₹ spent), a map of the trip, and a vertical timeline of photo stops, charging halts, food breaks, hotels, scenic views. Phase 2 layers in a small, curated community — public journeys, likes, comments, follows.

Unit of value: **the Journey**. Not the battery. Not a generic feed. The journey.

**Voice:** Calm, confident, premium. Closer to *Linear* and *Apple* than *Notion*.
**Tagline:** *Every drive. Every charge. Every memory.*

---

### 2. Target reference bar

Visual love-child of: **Polarsteps** (trip storytelling), **Linear** (chrome, motion, dark mode), **Apple Photos** (cover photo treatment), **Strava** (stats card, social feed cards), **Arc Browser** (delight in mundane interactions).

Generic Material You / iOS settings page = failed. Every screen needs at least one craft moment.

---

### 3. Design system — exact tokens

```css
/* Dark mode (default — hero theme, show first) */
--bg:          #0A0A0A;
--surface:     #141417;
--surface-2:   #1E1E22;
--border:      #2E2E33;
--text:        #FAFAFA;
--text-muted:  #A1A1AA;
--primary:     #2DD4BF;   /* deep teal — "electric current" */
--primary-bg:  #0D2E2A;
--primary-fg:  #062322;
--accent:      #FBBF24;   /* sunset amber */
--danger:      #F87171;

/* Light mode */
--bg:          #FAFAFA;
--surface:     #FFFFFF;
--surface-2:   #F1F1F3;
--border:      #D4D4D8;
--text:        #18181B;
--text-muted:  #52525B;
--primary:     #0EA5A2;
--primary-bg:  #D7FBF6;
--accent:      #B45309;
```

**Typography (Google Fonts):**
- Display (cover overlays, titles): `Instrument Serif`, italic
- Headings & UI: `Inter Tight`, 500-600
- Body: `Inter`, 400-500
- Stats numerals: `JetBrains Mono` (tabular-nums)

**Spacing:** 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96 px
**Radii:** 8, 12, 16, 24, 999 (pills)

**Motion:**
- Easing default `cubic-bezier(0.22, 1, 0.36, 1)` (out-quint)
- Micro 150ms · Standard 300ms · Hero 500ms
- Press: scale 0.97, 80ms in / 200ms out
- Hero photo: parallax (translateY by ~0.4× scroll delta)
- List entrances: stagger 40ms
- Map pins: drop with spring, 60ms apart
- AI generation (Phase 3): shimmer reveal char by char

---

### 4. Frame & viewport

- Mobile frame centered on page (360 × 740 — slightly smaller than iPhone for chat-viewport friendliness). 8-12px rounded black bezel, dynamic-island silhouette at top.
- Page background outside frame: `radial-gradient(circle at 50% -10%, #1c1c1f 0%, #050505 70%)`.
- **Theme toggle** (sun/moon, with text label) in top-right of the page.
- **Screen picker** above the phone (NOT below) — a 3-column grid of chips with numbered badges (1-15), so all picker chips fit without scrolling.

---

### 5. Screens — Phase 0 + Phase 1 (carry-over from v1.0)

#### 1. Onboarding (single screen)
Sunset-coastal-road BG → headline *"Every drive. A story worth keeping."* in Instrument Serif italic → sub copy → dots indicator → "Continue with email" (primary) + "Continue with Google" (ghost). Tap email → Home with journeys.

#### 2. Home — empty state
Top bar wordmark "EV Journey" small + Search icon button. Centered illustration of curving road with horizon pin. Headline *"Your first road trip is waiting."* + CTA *"Start a journey"*. Bottom tab bar: Home · Map · ➕ · Discover · Profile.

#### 3. Home — with journeys
Top bar "Your journeys" with subline "3 trips · 547 km logged" + install/PWA shortcut icon. 3 vertical journey cards, each full-bleed cover + gradient + Instrument Serif italic title + mono metadata. Visibility chip top-left (Private / Public). Cards stagger-fade on entry. Tap → Journey Detail.

#### 4. Journey Detail (HERO — spend 30% of effort here)
- Full-bleed cover with parallax, breathing 1.02× scale loop
- Back button (with text "Back") + More button top corners
- Hero overlay: dates in mono small caps, big italic title, vehicle + visibility chips
- Glass stats card hanging over bottom of hero: 2 rows × 3 stats — Distance, Duration, SOC (with `96% → 18%` colored arrow), kWh added, ₹ spent, Stops
- Map preview: stylized cartographic grid, animated route polyline (draws over 1.4s), 6 pins drop with spring stagger
- Timeline section: header "Timeline · 6 events" + "Add event" button
- Vertical rail with circular kind nodes connected by line. Each event card: kind chip, timestamp, title, note. Charging events show 3-tile mini grid: connector, kWh, cost
- Footer actions: "Share card" (primary) + "Edit" (ghost)

#### 5. Create Journey (bottom sheet)
Dimmed BG. Sheet rises. Title "New journey" + close. Dashed cover photo tile. Fields: Title, Dates (range), Vehicle (selected chip-style). Footer: "Save draft" + "Start journey" → goes to Add Event.

#### 6. Add Timeline Event (bottom sheet)
Tighter sheet. Kind chips row at top — Charging (active by default), Photo, Food, Hotel, Scenic, Custom — switching the form below with crossfade.
Default (charging selected): SOC ring (80px arc with start% → end% colored numerals), 2-col grid of fields (Connector, Cost), rating row (5 stars), "Add to timeline" primary CTA.

#### 7. Profile + Garage (your own)
- Header: avatar (Instrument Serif initial inside teal gradient circle) + name (italic serif) + @handle + city. Settings gear top-right.
- Stats row: Journeys / Km / kWh — mono numerals + uppercase labels.
- Garage section header "Your garage" + Add vehicle button. Horizontal scroll of vehicle cards with Instrument Serif nickname + model + battery kWh + range, color swatch in corner.
- Journeys section: 2-column grid of square thumbnails with serif italic labels.
- Bottom tab bar with Profile active.

#### 8. Settings
- Back button + Settings title in italic serif.
- Grouped cards in surface color: Appearance (Theme segmented control Light / Dark / Auto, Language), Account (Email / Notifications / Privacy / Sign out / Delete account in danger red), About (Version / Privacy policy / OSS credits).
- Italic serif footer: *"Made with care."*

#### 9. Install PWA (coach card)
Full-bleed sunset BG with chrome over it. Italic serif headline *"Keep your journeys one tap away."* + sub copy. Floating card at bottom with EV Journey logo, three numbered steps for iOS Add to Home Screen, "Got it" CTA.

---

### 6. Screens — Phase 2 (NEW IN v1.1, community lite)

> **Design principle:** Community should feel like a calm dinner party, not Twitter. Few visible numbers (counts hidden until tap), generous whitespace, no algorithm-y rage. Pull from Polarsteps and Glass.app, not Instagram.

#### 10. Visibility selector (bottom sheet)
Triggered when user taps "Publish" on a draft journey, or changes visibility on an existing one. Bottom sheet rises with title "Who can see this?". Three large stacked option cards (each ~80px tall):

| Option | Icon | Title | Description |
|---|---|---|---|
| Private | `ti-lock` | "Just you" | "Only visible in your own journeys." |
| Followers | `ti-users` | "Followers" | "People who follow you can view." |
| Public | `ti-world` | "Public" | "Anyone in EV Journey can discover." |

Currently-selected option has a teal border + small check icon top-right. Tapping changes selection. Footer button: "Publish journey" (primary) when set to anything ≠ Private, or "Save" if Private. Below: micro-copy in muted text — *"You can change this anytime."*

#### 11. Public feed (Discover tab)
This is the **Discover tab** when activated from the bottom tab bar. Reuses cards but with author attribution and social row.

- Top bar: title "Discover" in italic serif + Search icon button
- Tab strip (horizontal pills, 3 tabs): **Following · Trending · Latest** — Trending is default active
- Feed of public journey cards (4 visible). Each card vertically structured:
  - **Author row** above the card: avatar (24px circle) + name + @handle + relative time (mono, e.g. "· 2h") in muted
  - **Journey card** — same hero treatment as Home cards (cover, gradient, italic title, route metadata)
  - **Action row** below card — 4 icon buttons with counts (when count > 0): heart (with red fill on liked), comment, share, bookmark (right-aligned). Tap heart bumps count and animates a soft red pulse.
- Pull-to-refresh hint at top: small spinner placeholder ring
- Cards alternate which destinations (Konkan, Spiti, Coorg) to feel varied
- Empty state for "Following" tab: *"Follow creators to see their journeys here."* + CTA "Find people" → Search

#### 12. Comments (bottom sheet over Journey Detail)
Opens when user taps the comment icon on a journey card OR a button on Journey Detail.

- Bottom sheet, 75% height, swipe-down dismiss
- Header: "Comments · 12" in italic serif + close icon
- Scrollable list of comment items, each:
  - Avatar (28px) + name + handle (muted) + time (mono, "· 14m")
  - Comment text (body, max 2 lines, expandable)
  - Action row: tiny heart icon + like count, "Reply" text button
  - Threaded replies indent 32px, smaller avatar (22px)
- One comment should have 2 visible replies threaded (proves nesting works)
- Footer composer row: current user avatar + text input "Add a comment…" + Send button (teal, disabled when empty)
- Sample comments: mix of charging tips, photo compliments, route questions. Indian-context-aware (mention Tata Power, dhabas, monsoons, etc.)

#### 13. Public user profile (someone else's)
Visiting another creator's profile. Differs from your own (#7) by:

- **Cover band** at top: subtle scenic gradient strip (~120px tall) — gives the profile a personal-website feel
- **Avatar** overlaps the cover/content boundary (negative margin)
- **Header content**: name (italic serif), @handle in muted, city + country with `ti-map-pin`, 2-line bio
- **Follow button** top-right of header — primary teal when not following ("Follow"), ghost outline when following ("Following · ✓"). Tapping toggles, with a brief scale animation. No settings gear.
- **Stats row**: Followers · Following · Journeys (each tappable — Followers/Following open #15)
- **Tab strip**: **Journeys · Saved · About** (Journeys default)
- **Journey grid**: 2-col thumbnail grid (same as your profile)

Use a placeholder name: *"Aanya Verma · @aanya"* — Bangalore, India · bio: *"Reviewer at @evhustle · weekend mountain wanderer · driving an MG ZS EV."*

#### 14. Search
Triggered from the search icon on Home / Discover.

- Top: search input (full-width, leading magnifier icon, "Cancel" text button right) — input is auto-focused appearance
- **Empty state** (no query): "Recent searches" header + 3 recent chips ("Sahyadri", "Tata Power", "@ravi.evlog") with `ti-history` icons. Below: "Trending now" section with 4 destination cards (small horizontal pills with thumb image + name)
- **Active state** (sample query "Sahyadri" pre-filled): tab strip — **All · People · Destinations · Vehicles · Journeys** — All is default. Results list below:
  - 2 people rows (avatar + name + @handle + Follow button)
  - 1 destination card (thumbnail + name + "8 journeys")
  - 2 journey cards (mini version — small cover, title, author, distance)

#### 15. Followers / Following list
Opened from any profile's Followers or Following stat.

- Top: Back button + "Followers" title (italic serif) + "234" count in muted
- Segmented control just below: **Followers · Following** (Followers active)
- Scrollable list of user rows, each:
  - Avatar (40px) on left
  - Center: name (medium weight) + @handle (muted) + bio one-liner (truncated, muted, smaller)
  - Right: action button — "Follow" (primary), "Following" (ghost with check), or "Follow back" (primary outline) for mutual relationships
- 6-8 sample rows, mix of Indian names with EV-relevant bios

---

### 7. Interactivity — non-negotiable

- Every tab, card, button, chip routes to the right screen with correct transition.
- State preserved per screen between visits (Home shows the same 3 cards on return).
- Theme toggle smoothly swaps every screen (300ms crossfade on `<body>`).
- **Phase 2 specific:**
  - Heart icons in feed are tappable — toggle filled state + count + brief scale pulse
  - Follow button toggles between Follow ↔ Following with state preserved
  - Visibility selector remembers selected option when reopened
  - Search input doesn't need real search; clicking a recent chip "fills" the input visually
  - Comments composer disables Send button when empty
- Screen picker chips below the phone work as direct-jump nav (15 chips, 3-col grid, numbered badges 1-15).

---

### 8. Output format

- One single HTML file. Inline `<style>` + inline `<script>`. No build tools.
- External assets allowed:
  - Google Fonts (Instrument Serif, Inter, JetBrains Mono)
  - Tabler icons via `https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css` (use `<i class="ti ti-NAME"></i>`)
  - Inline SVG for cover photos (stylized abstract scenes — sunset / mountain / coast / neon / forest) — DO NOT use Unsplash
- Vanilla JS only. No React, Vue, Tailwind CDN, etc.
- Mobile-first inside the 360 × 740 frame.
- Accessibility: semantic HTML, aria-labels on icon buttons, focus rings.
- Length: expect 2500-3500 lines of code. That's OK.

After the code, add a 100-word "Designer's notes" section calling out the **three Phase 2 design decisions** you're proudest of.

---

### 9. Tonal anchors for new community copy

Keep the voice calm and adult. No "post 🔥" or "drop a 👏". Examples that fit the bar:

- Comments: *"That charger had a 5-minute queue when I went too — worth the chai stop"*
- Bio: *"weekend mountain wanderer · driving an MG ZS EV"*
- Empty state: *"Follow creators to see their journeys here."*
- Visibility helper: *"You can change this anytime."*

Avoid: trending hashtags as visual noise, "level up your EV game", any phrase a startup would put on a billboard.

---

### 10. Don't bother with

- Sign-in form internals (Continue → Home, that's enough)
- A working map (stylized fake is correct)
- Responsive desktop (phone frame on centered page is the deliverable)
- Real data persistence (in-memory is fine)
- Phase 3 features (AI title/story, trending algorithm, push, notification inbox) — those come in v1.2

---

### 11. Ship it

When you're done the reviewer should be able to open the HTML, see a stunning dark-themed phone mockup, tap all 15 screens via the picker, switch to light mode, like a journey, write a comment in the composer, toggle a Follow button, change visibility on a publish flow — and feel: *"This is the bar."*

Begin with design tokens and `<style>`, then build screens in order 1 → 15. Don't ask clarifying questions — make tasteful decisions and ship.

## PROMPT ENDS HERE

---

## Appendix A — Sample Phase 2 content

**Public feed cards (Trending tab):**

1. **Aanya Verma · @aanya · 2h** — *"Spiti in a hatchback"* — MANALI → KAZA · 412 KM · 4 STOPS · ♥ 84 · 💬 12
2. **Ravi Mishra · @ravi.evlog · 5h** — *"Konkan in the monsoon"* — PUNE → GANPATIPULE · 248 KM · 3 STOPS · ♥ 56 · 💬 7
3. **Priya Nair · @priyaonroad · 1d** — *"Coorg coffee crawl"* — BANGALORE → MADIKERI · 268 KM · 5 STOPS · ♥ 124 · 💬 21
4. **Karthik S · @kart.ev · 2d** — *"Ooty ridge at dawn"* — CHENNAI → OOTY · 565 KM · 6 STOPS · ♥ 211 · 💬 34

**Sample comments on "Bombay to the hills":**

- *Aanya Verma · @aanya · 14m* — *"Tiger point at golden hour is unbeatable. Did you take the old Pune road or the expressway?"*
  - *You · 8m* — *"Expressway up, old road back. Worth the slow way home."*
- *Ravi Mishra · @ravi.evlog · 1h* — *"That Statiq charger at Pune bypass was the slowest 56 minutes of my life lol. Did you queue?"*
  - *You · 45m* — *"No queue but two other Nexons were charging. Felt like an EV meetup."*
- *Priya Nair · @priyaonroad · 3h* — *"How was the AC on the incline? My ZS EV drops range pretty fast on those climbs."*

**Sample Followers list users:**

| Avatar initial | Name | Handle | Bio |
|---|---|---|---|
| A | Aanya Verma | @aanya | Reviewer at @evhustle · Bangalore |
| R | Ravi Mishra | @ravi.evlog | EV YouTuber · Pune |
| P | Priya Nair | @priyaonroad | Weekend driver · Coorg / Bangalore |
| K | Karthik S | @kart.ev | Tesla Model 3 · Chennai |
| S | Sanjay Iyer | @sanjayev | Long-distance · Hyderabad |
| M | Meera Joshi | @meeraj | Coastal trips · Mumbai |

---

## Appendix B — Iteration prompts for v1.1+

After Claude generates the prototype, refine with:

- *"The Discover feed feels too noisy. Reduce social action counts in default view — show on tap only."*
- *"The Public Profile cover band should feel personal. Let the user pick a scene gradient (sunset / coast / forest) that becomes their identity."*
- *"Comments composer needs more weight — give it more height and a faint top divider, like Threads."*
- *"Add a 16th screen: shared-card preview before the user posts — they pick the photo, see the rendered card, then publish."*

---

*End of EVJ-02 Claude Design Master Prompt v1.1 — Phase 0 + 1 + 2 complete.*
