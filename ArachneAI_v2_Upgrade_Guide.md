# ArachneAI — v2 Upgrade Guide
### Three-App Architecture, Full Attack Catalog, Real-vs-Fake Content, and Neumorphic UI System

Your current build proves the spine works (auth passes, backend/frontend run, SSRF + Broken Auth fire correctly). This guide upgrades that spine into the "three distinct humans" architecture you described, expands the attack catalog to all 15, gives you a concrete college-themed target site with a real/fake content split, and gives you a full neumorphic design system in green/black/white.

---

## 1. Why Three Separate Apps (and how they talk)

Right now everything likely lives in one frontend. Split it into **three independently-running frontends**, all talking to the **same FastAPI backend**, because that's what makes the demo read as "real":

```
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│   1. TARGET SITE      │   │  2. ATTACKER CONSOLE  │   │ 3. SECURITY DASHBOARD│
│   (the "victim" —      │   │  (the "attacker" —     │   │ (the "defender" —     │
│   college website,      │   │  a hacking-tool style    │   │  monitors 1 & 2 live) │
│   real login, real       │   │  UI to launch attacks     │   │                        │
│   content)                │   │  against Target Site)      │   │                        │
│   :3000                    │   │  :3001                       │   │  :3002                 │
└──────────┬───────────────┘   └──────────┬──────────────────┘   └──────────┬─────────────┘
           │                                │                                 │
           │ real user actions               │ attack requests                 │ polls/streams
           │ (register, login,                │ (choose scenario,                │ everything below
           │  browse courses,                  │  target, launch)                  │
           │  submit forms...)                  │                                    │
           ▼                                    ▼                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                FastAPI Backend (:8001)                                 │
│   /api/v1/target/*        /api/v1/simulation/*        /api/v1/dashboard/*, /incidents/* │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Key architectural decision:** the Attacker Console does **not** call the deception-engine or AI-engine directly. It only calls `/api/v1/simulation/start`, which internally drives requests at the **Target Site's own API** (`/api/v1/target/*`) — exactly as a real external attacker would only ever see the Target Site, never your backend's internals. This is what makes "the dashboard monitors it even in normal time and during/after attack" true: the Security Dashboard is watching the *same* telemetry stream regardless of whether the request came from a real browser user or from the Attacker Console — it has no special knowledge of which is which, just like real security monitoring.

### Why this is a meaningfully better hackathon story
- It **looks like three different people** using three different tools, which is exactly how a SOC demo should look to judges.
- It proves your telemetry/detection layer works on *organic* traffic too, not just scripted attacks — you can literally browse the college site normally during the demo and show the dashboard staying calm ("Normal Activity" state), then switch to the Attacker Console and show it light up.
- It cleanly separates "things a real attacker could do" (Attacker Console + Target Site only) from "things only the platform owner sees" (Security Dashboard), which is a correct real-world security boundary, not just a UI nicety.

---

## 2. App 1 — Target Site ("Crestwood College")

Pick a college as your sample organization (concrete, relatable, has natural real-vs-fake content opportunities: students, staff, grades, financial aid, admin portals). Call it **Crestwood College** or similar.

### 2.1 Real site structure (what a normal visitor/student sees)
```
/                     → Public homepage (about, programs, news)
/admissions            → Admissions info, apply form (real form, stored in DB)
/login                  → Real login (student/staff/admin roles)
/portal/dashboard        → Post-login student dashboard (grades, schedule, fees)
/portal/courses            → Course catalog, enrollment
/portal/profile              → Editable student profile
/faculty                       → Faculty directory (public)
/admin (role-gated)              → Admin panel: manage students, view "internal documents"
```

### 2.2 Real login (not hardcoded)
Replace the current "already-written password and access" with a genuine flow:
- `POST /api/v1/target/auth/register` — real students can self-register (name, email, password) → hashed and stored.
- `POST /api/v1/target/auth/login` — real bcrypt verify + JWT issue, same pattern as your platform's own auth, just scoped to the Target Site's own user table (`target_users`, separate from ArachneAI platform users — don't reuse the same table, since this is the "victim" org's own accounts).
- Seed 4–5 realistic demo accounts (e.g. `student1@crestwood.edu`, `admin@crestwood.edu`) via `database/seed_data.py` so the Attacker Console has plausible real targets to attempt credential attacks against, but the *system itself* is a real, working auth flow — not a fixed backdoor.

### 2.3 Real vs. Fake content — the core "show, don't tell" feature
This is what your prompt is really asking for: the demo needs to visually prove "here's what's real, here's what the attacker actually got, and it's fake." Build this explicitly:

| Location in site | Real content (what it looks like) | Fake/honeytoken counterpart (planted alongside) |
|---|---|---|
| `/portal/profile` | Student's real name, real (seeded) grades | A "linked services" section shows a fake `financial-aid-api-key.txt` download link |
| `/admin/students` (admin-only) | Real seeded student roster | A `Payroll_2026.xlsx` and `Faculty_Salaries.pdf` sitting in the same file list |
| `/admin/system` | Real (harmless) system status page | A fake `.env` file exposed via a deliberately weak "config export" button, containing a honeytoken `AWS_ADMIN_KEY` |
| Course catalog API | Real course JSON | An IDOR-vulnerable `/api/v1/target/students/{id}` that, at ID ranges outside the real seeded range, returns a honeytoken "ghost student" record (e.g. `Provost_Account`) with fake SSN-like field, clearly marked in your internal DB as bait |
| Login page | Real registered accounts work normally | One seeded "leaked-looking" credential (`admin_backup / Winter2024!`) planted in a fake "leaked credentials paste" your Attacker Console can reference, so credential-stuffing has something plausible to try |
| File upload (e.g. assignment submission) | Real file gets stored normally | The upload directory also contains an already-planted `Exam_Answer_Key.pdf` honeytoken discoverable via path traversal / weak access control |

**Implementation pattern:** every real content table (`students`, `courses`, `documents`) gets a sibling flag or a separate `honeytoken_id` foreign key on the same underlying `documents`/`files` table, rather than a totally separate content type. E.g.:
```python
class Document(Base):
    id, title, file_path, owner_id, is_honeytoken (bool), honeytoken_id (FK, nullable)
```
This lets the Company/Student Explorer UI render real and fake files **visually identically** to the attacker (that's the point — deception only works if it's indistinguishable), while your backend and Security Dashboard always know the difference because of `is_honeytoken`.

### 2.4 What makes this "well made" rather than a stub
Give the college site actual depth so it doesn't look like a demo shell:
- Real homepage with programs, news carousel, campus photos (use free stock/AI-generated images — see `assets/`).
- A working admissions form that actually writes to the DB.
- A functioning course catalog with enrollment (even 8–10 seeded courses is enough).
- A profile page with editable fields.
- Believable but harmless "internal" pages (IT helpdesk, staff directory) — these are exactly where you plant the fake credential/document honeytokens, since real orgs keep their most sensitive-looking stuff in exactly these unglamorous internal corners.

---

## 3. App 2 — Attacker Console

A separate, deliberately tool-like UI (this can look terminal-esque / different visual language from the other two, on purpose — see §5).

### 3.1 What it actually does
It is a **controller UI for the `attack-simulator/` scenarios**, not a hand-crafted exploit tool. It shows:
- A target selector (auto-fills the running Target Site's URL/known endpoints).
- A list of the 15 attack scenarios (see §4) as selectable cards, grouped by category.
- A "Launch" button per scenario → calls `POST /api/v1/simulation/start`.
- A live log pane streaming the raw HTTP requests/responses the simulator is sending (this is genuinely useful for the demo — it's the "attacker's-eye view" showing exactly what payload went out and what came back).
- A result banner: "Scenario complete" / "Honeytoken triggered — incident created" (deliberately delayed by 1–2 seconds after the real telemetry event, so it doesn't spoil the Security Dashboard's own detection timing during the demo).

### 3.2 Why keep it separate from the simulation logic you already built
You don't need to rewrite `attack-simulator/`. This is a **new frontend only**, calling your existing `/api/v1/simulation/start` and `/api/v1/simulation/{id}` endpoints. The only backend addition needed is a lightweight `GET /api/v1/simulation/{id}/log` (or a WebSocket) that streams the raw request/response pairs the scenario is generating, for the live log pane.

---

## 4. Expanding From 2 Attacks to All 15

You currently have SSRF and Broken Auth working. Here's the concrete addition plan, reusing the mapping from your original guide but now anchored to the actual Crestwood College site so each has a real, specific target:

| # | Attack | Concrete Crestwood target | Honeytoken triggered |
|---|---|---|---|
| 1 | Broken Auth (done) | `/login` credential stuffing against seeded accounts | Fake `admin_backup` credential |
| 2 | SSRF (done) | `/admin/system` "check external link" tool fetches an internal-looking URL | Fake internal `/internal/finance-api` |
| 3 | XSS (stored) | Course review/comment box on `/portal/courses/{id}` — deliberately unsanitized, rendered back to other viewers | A fake "admin session cookie" honeytoken value is what the stored script would exfiltrate in the simulated payload |
| 4 | CSRF | `/portal/profile` "update email" form, missing CSRF token check | Access to a honeytoken "Provost" profile record |
| 5 | Broken Access Control / IDOR | `/api/v1/target/students/{id}` — incrementing ID reaches a honeytoken "ghost student" | Fake student record with fake SSN-shaped field |
| 6 | Command Injection | `/admin/system` "ping diagnostic" tool, sandboxed, resolves a fake local honeytoken file | `Exam_Answer_Key.pdf` |
| 7 | File Upload | Assignment submission endpoint accepts any extension | Reveals `Faculty_Salaries.pdf` sitting in same directory |
| 8 | API Abuse | `/api/v1/target/students` bulk endpoint, no rate limit, mass-assignment accepts extra `"role": "admin"` field on registration | Escalates a normal seeded account into a fake "admin" flag, flagged as honeytoken behavior |
| 9 | Session Attacks | Reuse of a captured (fake) session token issued specifically as bait after a simulated "logout" | Session-honeytoken reuse detected |
| 10 | MITM (simulated signature only) | Attacker Console sends a request with a mismatched cert-fingerprint header / suspicious `X-Forwarded-For` chain, clearly labeled "simulated" | Anomalous-connection telemetry event |
| 11 | DNS/Redirect | `/go?url=` open redirect on the college's "external resources" page | Points to a fake phishing-lookalike domain string |
| 12 | Deserialization | `/admin/system` "import settings" endpoint accepting a JSON/pickled blob, sandboxed process only | Fake debug endpoint honeytoken |
| 13 | XXE | "Import transcript (XML)" feature on `/admin/students` | XML external entity references a fake local honeytoken path |
| 14 | Web Cache Poisoning | Homepage behind a deliberately weak cache-key config reflecting `X-Forwarded-Host` | Poisoned response references a honeytoken value |
| 15 | Supply Chain | Fake `package.json` dependency in a public "developer resources" page, fake internal registry pull logged | Fake CI/dependency honeytoken |

**Build order for these 13 new ones:** XSS, IDOR, CSRF, File Upload first (visually clearest, cheapest to build against the college site's natural pages) → API Abuse, Session Attacks, Command Injection next → the remaining 5 (MITM, DNS/Redirect, Deserialization, XXE, Cache Poisoning, Supply Chain) last, since several of them are more about telemetry-signature simulation than a fully real vulnerable code path — acceptable given none of your 15 should touch real infrastructure anyway.

---

## 5. App 3 — Security Dashboard: Three States, Not Just "During Attack"

You specifically asked for the dashboard to reflect **normal time, during-attack, and post-attack** — right now it likely only reacts to incidents. Add an explicit state model:

```
Dashboard top banner cycles through:
🟢 NORMAL       — no open incidents; still shows live (harmless) traffic ticking in
                  from real Target Site browsing (proves it's actually watching, not idle)
🟡 INVESTIGATING — an incident is open, AI agents currently running
                  (live agent status list updates here)
🔴 CRITICAL      — AI investigation complete, high risk score, awaiting human approval
⚪ CONTAINED     — recommendation approved, incident closed, report available
```

**Concrete build:** a single `GET /api/v1/dashboard/status` endpoint that returns `{ state, open_incidents: [...], recent_activity: [...] }`, polled every 3–5s (or WebSocket if you have time). "Recent activity" should include **both** ordinary Target Site telemetry (logins, page views — tagged `normal`) and honeytoken events (tagged `alert`), rendered in one unified live feed so the "even in normal time" requirement is visibly true — the dashboard is clearly watching everything, not just spinning up when an attack starts.

---

## 6. Backend Changes Required for the 3-App Split

Minimal, additive — you don't need to rebuild what you have:

1. **New router file** `routers/target.py` (or a whole sub-app) exposing the Target Site's own API: `/api/v1/target/auth/*`, `/api/v1/target/students/*`, `/api/v1/target/courses/*`, `/api/v1/target/documents/*`. This is genuinely a second, smaller "application" living inside the same backend for simplicity (one FastAPI instance, two logical API groups) — you do **not** need a fully separate backend server unless you have time to spare; separate *frontends* is what actually delivers the "three distinct apps" experience to judges.
2. **CORS config** in `main.py` allowing all three frontend origins (`:3000`, `:3001`, `:3002`).
3. `deception-engine/telemetry/watcher.py`'s direct-callback approach (from the previous guide) now fires from `routers/target.py` handlers whenever a request touches a `Document`/`User` row with `is_honeytoken=True`.
4. `dashboard.py` gains the `/status` endpoint described in §5.
5. `simulation.py` gains a log-streaming endpoint/WebSocket for the Attacker Console's live pane.

Nothing in `ai-engine/`, `models/`, or `services/incident_service.py`/`ai_service.py` needs to change — they already sit correctly behind the single ignition point (`telemetry_service.record_event`), which is exactly why this restructuring is additive rather than a rewrite.

---

## 7. UI/UX Design System — Neumorphism, Green/Black/White

Apply this **one shared design system** across all three apps, varied only by accent usage, so they feel like one coherent product family while still being visually distinguishable.

### 7.1 Palette
```
--bg-base:        #0E1512   /* near-black, slight green undertone */
--bg-surface:      #131B17   /* card/panel base */
--bg-elevated:       #172019   /* raised neumorphic surface */
--accent-primary:      #2FDD8F  /* signature green — primary actions, "normal/safe" state */
--accent-secondary:      #14A868 /* deeper green — hover/active */
--accent-alert:            #FF5C5C /* used ONLY for critical incident state, sparingly */
--accent-warning:            #F5C15A /* investigating/pending state */
--text-primary:                #F4FBF7  /* near-white */
--text-secondary:                #9FB3A9  /* muted green-grey */
--shadow-dark:                    rgba(0,0,0,0.55)
--shadow-light:                    rgba(255,255,255,0.03)
```

**Rule:** green and white are the dominant palette (calm, "we've got this monitored" feeling); red is reserved *exclusively* for the CRITICAL state banner and nothing else, so it retains visual weight when it appears.

### 7.2 Neumorphism principles to actually apply (not overdo)
Modern neumorphism (2024–2026 revival) works well combined with dark backgrounds and subtle depth, unlike the original light-gray-only trend. Apply it selectively:
- **Soft dual shadows** on cards/buttons: `box-shadow: 6px 6px 12px var(--shadow-dark), -4px -4px 10px var(--shadow-light);` on `--bg-elevated` surfaces.
- **Inset shadows for "pressed" states** (active nav item, selected attack scenario card): flip the shadow direction inward.
- **Never apply neumorphism to text-heavy content areas** (tables, logs, code panes) — keep those flat/high-contrast for readability; reserve the soft-shadow treatment for containers, buttons, toggles, and stat cards. This is the most common neumorphism mistake (illegible low-contrast text) — avoid it deliberately.
- **Border-radius consistently large** (16–24px) on elevated cards, smaller (8–10px) on inline controls, for visual hierarchy.

### 7.3 Modern UX principles to layer on top
- **Progressive disclosure** on the dashboard: show summary stat cards first, click-through to full incident detail — don't dump the entire AI reasoning trail on the main view.
- **Real-time feedback affordances**: skeleton loaders (not spinners) while AI agents are "thinking," subtle pulse animation on the live status dot for the current dashboard state.
- **Consistent 8px spacing grid** across all three apps — genuinely the single highest-leverage change for "looks professional" with minimal effort.
- **Command-palette / quick-launch pattern** for the Attacker Console (press `/` to search scenarios) — small touch, reads as "serious tool" to judges.
- **Empty/normal states designed on purpose**, not left blank — the dashboard's 🟢 NORMAL state should still feel populated (live but calm activity feed), reinforcing "always watching."
- **Distinct typographic voice per app** within the same font family: Target Site uses a warmer, slightly larger body type (feels like a real institutional site); Attacker Console uses a monospace accent font for logs/payloads (feels like a tool); Security Dashboard uses tighter, data-dense type (feels like a SOC console). Same base font (e.g. Inter) family, different weight/size/mono treatment — keeps it coherent, not fragmented.

### 7.4 Per-app visual differentiation within the shared system
| App | Accent emphasis | Distinguishing UI motif |
|---|---|---|
| Target Site (Crestwood College) | Green + white, warm, editorial | Rounded cards, campus imagery, generous whitespace — should *not* look like a security tool at all |
| Attacker Console | Black-dominant, green-on-black terminal accents | Monospace log pane, card-select scenario grid, minimal chrome |
| Security Dashboard | Green/white base, red reserved for critical | Dense stat-card grid, live status banner, timeline/replay component with neumorphic step nodes |

---

## 8. Updated Priority Order (from where you are now)

1. **Split into three frontend apps** pointing at the same backend (biggest structural change, do first — everything else layers on top cleanly).
2. **Build Crestwood College's real content + real login**, replace the hardcoded credential.
3. **Add the real/fake content pairing** (§2.3 table) — even 4–5 pairs is enough to make the "here's real, here's what they actually stole" demo moment land.
4. **Add 4 new attacks** (XSS, IDOR, CSRF, File Upload) — highest visual payoff for effort.
5. **Build the Attacker Console UI** around your existing simulation endpoints.
6. **Add the dashboard's three-state model + always-on activity feed.**
7. **Apply the design system** (§7) — do this after the functional split, not before, so you're not re-skinning components twice.
8. **Remaining 9 attacks** as time allows, roughly in the order listed in §4.

This keeps your already-working SSRF/Broken-Auth pipeline intact throughout — you're restructuring the surface area around it, not replacing the working core.
