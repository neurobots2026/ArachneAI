# ArachneAI — v3 Build Guide
### All 15 Attacks (Implementable), Standalone College Site, 3-App Architecture Split, and Dark-Green UI System

---

## 1. Reading the Reference Image Into a Design System

The reference dashboard image uses a pattern worth naming precisely so you can reproduce it: **frosted glass cards floating over a dim background, soft rounded corners, a slim icon rail on the left, stat widgets in pill-shaped containers, a large hero chart card, and warm accent gradients on the "featured" card.** Translate each element to your green/black/white theme:

| Reference element | What it is | Your dark-green translation |
|---|---|---|
| Blurred moody background photo behind the whole UI | Depth-of-field ambiance | Replace with a subtle radial gradient (`#0B120E` → `#050A07`) or a very low-opacity abstract mesh/network-node pattern (fits a security product) instead of a photo |
| Frosted glass cards (`backdrop-filter: blur`) | Glassmorphism, not neumorphism, is actually what this image shows | Use **glassmorphism for large containers** (dashboard panels, modals) and **neumorphism for small interactive controls** (buttons, toggles, nav icons) — combining both is the current (2025–2026) trend and matches what you're pointing at |
| Slim left icon rail, circular active-state highlight | Primary nav | Keep this exact pattern — icon-only rail, active item gets a soft green glow + inset shadow |
| Stat pills ("Total Balance," "Earnings," "Expenses") with icon + label + value | Compact KPI cards | Reuse directly for: Open Incidents / Honeytokens Active / Avg. Risk Score |
| Large chart card with dotted trend line + "Top Contributor" legend | Hero analytics panel | Reuse directly for: Incidents-over-time trend, with legend split by attack category instead of spending category |
| Gradient "Visa card" widget (orange/red glow, floating, card-tilt) | A featured/highlighted object | Reuse for a **"Critical Incident" spotlight card** — same visual treatment (floating, glowing border) but in red only when a critical incident is open; green glow when the system is idle/nominal, so the same component communicates two states just by swapping the gradient |
| Circular donut progress ("60% Travel Abroad") | Goal-completion rings | Reuse for: "Containment Progress," "Investigation Completion %," "Honeytoken Coverage by Department" |
| Rounded avatar + name + amount row ("Month Transaction") | Activity list row | Reuse directly for: live Telemetry Activity Feed — avatar becomes a small attack-type icon, name becomes source IP/user, amount becomes risk score |

**Concrete CSS pattern for the glass cards:**
```css
.glass-card {
  background: rgba(19, 27, 23, 0.55);
  backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid rgba(47, 221, 143, 0.12);
  border-radius: 22px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.45);
}
.neumorphic-control {
  background: #172019;
  border-radius: 14px;
  box-shadow: 6px 6px 14px rgba(0,0,0,0.5), -4px -4px 10px rgba(255,255,255,0.03);
}
.neumorphic-control:active,
.neumorphic-control.is-active {
  box-shadow: inset 4px 4px 8px rgba(0,0,0,0.5), inset -3px -3px 6px rgba(255,255,255,0.03);
}
```

**Palette (carried over, slightly refined for this darker photographic feel):**
```
--bg-deep:       #050A07
--bg-base:        #0B120E
--glass-surface:   rgba(19,27,23,0.55)
--accent-green:      #2FDD8F
--accent-green-dim:    #14A868
--accent-glow:            0 0 24px rgba(47,221,143,0.35)
--accent-critical:          #FF5C5C
--accent-critical-glow:       0 0 24px rgba(255,92,92,0.35)
--text-primary:                 #F4FBF7
--text-muted:                     #8FA79B
```

Apply this system to the **Security Dashboard specifically** — it's the app that most resembles the reference image's "data-rich personal dashboard" feel. The College Site should look like a real college (see §3), and the Attacker Console stays terminal/tool-like (see previous guide, §7.4) — same color family, different density and motif, exactly as specified before.

---

## 2. All 15 Attacks — Implementable Specs

Right now only one attack works end-to-end. Below is a build-ready spec per attack: **vulnerable endpoint, the actual (safe, self-contained) vulnerable code pattern, the payload the Attacker Console sends, and the exact honeytoken/telemetry trigger.** Build these against the College Site (`routers/target.py` from the previous guide) in the order given — each is scoped to be buildable in under an hour once the pattern is familiar.

### 2.1 Broken Authentication / Credential Attacks
- **Endpoint:** `POST /api/v1/target/auth/login`
- **Vulnerable pattern:** no rate limiting or lockout on failed attempts; a seeded honeytoken account `admin_backup` with a "leaked-looking" password exists.
- **Attacker Console payload:** loop through a small wordlist against `admin_backup`.
- **Trigger:** successful login against a `User` row flagged `is_honeytoken=True` → `telemetry_service.record_event(honeytoken_id=..., event_type="credential_login")`.

### 2.2 Server-Side Request Forgery (SSRF)
- **Endpoint:** `POST /api/v1/target/admin/tools/fetch-preview` (an "IT link-checker" tool in the admin panel).
- **Vulnerable pattern:** the endpoint takes a raw `url` param and fetches it server-side with no allow-list.
- **Payload:** `{"url": "http://localhost:8001/internal/finance-api"}` — a fake internal route you define purely as bait.
- **Trigger:** the internal bait route itself calls `telemetry_service.record_event()` when hit — the vulnerable fetch code doesn't need to know it's bait, exactly as a real SSRF works.

### 2.3 Cross-Site Scripting (XSS) — stored
- **Endpoint:** `POST /api/v1/target/courses/{id}/reviews`
- **Vulnerable pattern:** review `comment` field is stored and re-rendered on the course page **without escaping** (deliberately skip your templating engine's auto-escape for this one field — document clearly in code comments that this is intentional).
- **Payload:** `<img src=x onerror="fetch('/api/v1/target/telemetry-beacon?tok=HT_XSS_COOKIE_01')">` — a safe, self-contained beacon call, not a real cookie theft.
- **Trigger:** `/telemetry-beacon` endpoint receiving `tok=HT_XSS_COOKIE_01` maps to a pre-registered honeytoken → records event with `attack_type_hint="xss"`.

### 2.4 Cross-Site Request Forgery (CSRF)
- **Endpoint:** `POST /api/v1/target/portal/profile/email`
- **Vulnerable pattern:** accepts the update with only the session cookie, no CSRF token check, no `Origin`/`Referer` verification.
- **Attacker Console payload:** a scripted POST simulating "a malicious page auto-submitting a form" — sent directly (you don't need a real third-party page; the simulator just sends the request without the token/header a legitimate same-site request would include).
- **Trigger:** if the account being modified is a seeded honeytoken profile (e.g. `Provost_Account`), record event; if it's a normal seeded account, still log it as a CSRF-pattern event (missing-token requests are themselves suspicious telemetry, useful even without a honeytoken hit — good talking point for judges: not every detection requires a honeytoken, some come from the deception engine watching request hygiene).

### 2.5 Broken Access Control / IDOR
- **Endpoint:** `GET /api/v1/target/students/{id}`
- **Vulnerable pattern:** no ownership check — any logged-in user can request any ID.
- **Payload:** authenticate as a normal seeded student, then request IDs sequentially until hitting a reserved honeytoken ID range (e.g. IDs `9000+` are always fake "ghost" records).
- **Trigger:** fetching any `Student` row with `is_honeytoken=True` fires the event.

### 2.6 Command Injection
- **Endpoint:** `POST /api/v1/target/admin/tools/ping`
- **Vulnerable pattern:** runs inside an isolated subprocess with **no real shell access to anything sensitive** — it "resolves" a fake local filename lookup rather than truly invoking `os.system`, so it's safe by construction:
```python
def ping_tool(host: str) -> str:
    # deliberately naive parsing, safe because it only maps to a fixed fake-file lookup table
    if ";" in host or "cat " in host:
        return read_fake_honeytoken_file("Exam_Answer_Key.pdf")
    return f"ping: {host} unreachable (simulated)"
```
- **Payload:** `{"host": "8.8.8.8; cat Exam_Answer_Key.pdf"}`
- **Trigger:** `read_fake_honeytoken_file()` call records the event.

### 2.7 File Upload Attacks
- **Endpoint:** `POST /api/v1/target/portal/assignments/upload`
- **Vulnerable pattern:** accepts any file extension, stores in a public-ish directory alongside a pre-planted honeytoken file.
- **Payload:** upload a `.php`-named file with inert text content.
- **Trigger:** on upload, list the directory contents in the response (deliberately, as the "vulnerability") — if the response includes `Faculty_Salaries.pdf`, and the Attacker Console then does a follow-up `GET` on that path, **that GET** is the actual trigger (accessing the honeytoken, not merely seeing its name, is what should fire telemetry — keep this distinction, it's more realistic).

### 2.8 API Attacks (mass assignment / excessive data exposure)
- **Endpoint:** `POST /api/v1/target/auth/register`
- **Vulnerable pattern:** accepts and applies unexpected extra fields from the request body (no strict Pydantic `extra="forbid"`), e.g. a `role` field.
- **Payload:** `{"email": "...", "password": "...", "role": "admin"}`
- **Trigger:** any registration where `role == "admin"` is unusual and flagged as a `honeytoken-adjacent` API-abuse event — you can also plant a genuine honeytoken here: the fake "admin" capability unlocks a route that itself is bait (`/admin/system` showing the `.env` honeytoken from §2.9-adjacent below).

### 2.9 Session Attacks
- **Endpoint:** any authenticated endpoint, using a specifically-issued **decoy session token**.
- **Vulnerable pattern:** sessions aren't invalidated server-side on logout (token remains valid until natural expiry).
- **Payload:** Attacker Console captures a session token issued to a honeytoken account during a scripted "login," waits past a simulated "logout" call, then reuses the same token.
- **Trigger:** the honeytoken account itself makes this deterministic — any authenticated call using that account's token is loggable/flaggable regardless of session-reuse timing, simplifying detection logic.

### 2.10 Man-in-the-Middle (signature simulation)
- **Endpoint:** any Target Site endpoint.
- **Approach:** you cannot safely demo real traffic interception. The Attacker Console instead sends a request carrying headers that *represent* what a MITM proxy would leave behind — a mismatched `X-Client-Cert-Fingerprint` header plus a suspicious `X-Forwarded-For` chain with multiple hops.
- **Trigger:** a small middleware rule (`middleware/`) flags requests where these headers look anomalous and calls `telemetry_service.record_event()` directly with `attack_type_hint="mitm_signature"` — no honeytoken needed here, this is pure request-metadata detection, and is worth explaining to judges as "the deception engine isn't the only detector; the platform also does baseline anomaly flagging."

### 2.11 DNS and Redirect Attacks
- **Endpoint:** `GET /api/v1/target/resources/go?url=`
- **Vulnerable pattern:** open redirect, no allow-list on the `url` param.
- **Payload:** `?url=http://crestwood-portal-login.fake-lookalike.example`
- **Trigger:** redirect target matched against a small blocklist of "known phishing-lookalike" strings you define for the demo → fires event.

### 2.12 Deserialization Attacks
- **Endpoint:** `POST /api/v1/target/admin/settings/import`
- **Vulnerable pattern:** accepts a JSON blob and does a naive `eval`-free but overly-trusting merge into settings (never use real `pickle.loads` on untrusted input, even for a fake demo — simulate the *effect*, not the real unsafe mechanism):
```python
def import_settings(blob: dict):
    if "__ht_marker__" in blob:
        read_fake_honeytoken_file("debug_config_honeytoken.json")
    settings_store.update(blob)
```
- **Trigger:** payload including `__ht_marker__` demonstrates "unexpected object structure caused unintended behavior" safely.

### 2.13 XML External Entity (XXE)
- **Endpoint:** `POST /api/v1/target/admin/students/import` (XML transcript import).
- **Vulnerable pattern:** XML parser configured **without** disabling external entity resolution (again, keep this contained to a fake local-file lookup table, never real filesystem access):
```python
FAKE_FS = {"file:///app/fake_secrets/aws.env": "AWS_ADMIN_KEY_HONEYTOKEN=..."}
def parse_transcript_xml(xml_str):
    entity_ref = extract_entity_uri(xml_str)  # naive regex, deliberately
    if entity_ref in FAKE_FS:
        record_honeytoken_access(entity_ref)
    ...
```
- **Payload:** XML with `<!ENTITY xxe SYSTEM "file:///app/fake_secrets/aws.env">`
- **Trigger:** as above.

### 2.14 Web Cache Poisoning
- **Endpoint:** `GET /` (homepage), sitting behind a deliberately weak cache-key function that includes `X-Forwarded-Host` in the cache key but doesn't validate it.
- **Payload:** request with `X-Forwarded-Host: attacker-controlled.example`, repeated twice — first "poisons" a simulated cache entry (an in-memory dict keyed naively), second request from a different simulated client shows the poisoned response.
- **Trigger:** cache poisoning attempt (mismatched host header causing a cache write) fires the event directly from the caching middleware.

### 2.15 Supply Chain Attacks
- **Endpoint:** `GET /developer-resources` (a public page listing the college's open-source tools/dependencies — realistic for a real college IT department page).
- **Approach:** list a fake internal package name (`crestwood-internal-utils`) pointing to a fake internal registry URL you control (`/api/v1/target/fake-registry/crestwood-internal-utils`). The Attacker Console "install-attempts" it.
- **Trigger:** any request to that fake-registry endpoint is inherently a honeytoken hit — nothing legitimate would ever call it.

---

## 3. Standalone College Website — No Attacker/Dashboard UI At All

Build this as its **own frontend project**, with zero attacker tooling, zero incident/telemetry UI — it must look and behave like a completely ordinary college website. Suggested name: **Crestwood College**.

### 3.1 Site map (public + authenticated)
```
/                          Homepage — hero banner, "Why Crestwood," news, upcoming events
/about                       History, mission, accreditation
/academics                     Programs list (6–8 realistic programs: CS, Business, Nursing, Psychology...)
/admissions                      Admissions info + a real, working "Apply Now" form
/campus-life                       Photos, clubs, housing info
/faculty                             Public faculty directory (name, dept, bio, photo)
/developer-resources                   IT dept's public page listing tools/dependencies (supply-chain bait)
/login , /register                       Real auth
/portal/dashboard  (post-login)            Student home: enrolled courses, GPA snapshot, announcements
/portal/courses                              Catalog + enrollment + review/comment box (XSS bait)
/portal/profile                                Editable profile incl. "update email" (CSRF bait)
/portal/assignments                              Upload area (file-upload bait)
/portal/financial-aid                              Real-looking but seeded financial data
/admin  (staff/admin role only)                      Student roster, "system tools" (SSRF/command-injection/
                                                       deserialization/XXE bait), settings import
```

### 3.2 Content depth checklist (so it reads as real, not a stub)
- Real-sounding copy for every page (mission statement, program descriptions, admissions requirements) — write this once, it's cheap and buys a lot of credibility.
- 8–10 seeded courses with descriptions, credit hours, instructor names.
- 5–6 seeded faculty bios with photos (free stock/AI-generated headshots).
- A working, validating "Apply Now" form that writes to the DB and shows a real confirmation.
- Campus imagery — a handful of free stock/AI-generated campus photos used consistently as a background/hero motif (ties back to the reference image's "photo behind glass cards" aesthetic, appropriately here rather than on the dashboard).
- A believable "IT Helpdesk" / "Developer Resources" page — this is *exactly* where real orgs' most sensitive-looking internal content lives, and it's your natural home for the SSRF tool, the settings-import (deserialization) feature, and the supply-chain bait package.

### 3.3 Where every bait point physically lives on this site
This is the direct answer to "add stuff needed to test our attacks" — every attack in §2 has a named, real-feeling page it lives on:
```
/portal/courses/{id}          → XSS (review box)
/portal/profile                → CSRF (update email)
/api/.../students/{id}           → IDOR
/portal/assignments               → File Upload
/login , /register                  → Broken Auth, API mass-assignment
(any authenticated route)             → Session Attacks
/admin/tools/fetch-preview              → SSRF
/admin/tools/ping                         → Command Injection
/admin/settings/import                      → Deserialization
/admin/students/import (XML)                  → XXE
/resources/go?url=                              → DNS/Redirect
/ (homepage, cache layer)                         → Cache Poisoning
/developer-resources                                → Supply Chain
(request-header level, any route)                     → MITM signature
```

### 3.4 Visual style for THIS site specifically
Unlike the Security Dashboard (which follows the reference-image dark glass style), the College Site should look like a **real, warm, editorial institutional website** — still in your green/dark palette so the product family is recognizable, but styled to feel human and public-facing rather than tool-like:
- Light-on-dark hero sections are fine, but content pages (academics, admissions) can use a lighter surface (`#F4FBF7` background, dark-green text) for readability — a real college site wouldn't be dark-mode-only.
- Rounded, photographic cards for programs/faculty/news — not neumorphic controls; this site should feel editorial, not "app-like."
- Green as the institutional brand color (think "Crestwood green," used the way a real school uses its school color), not as a security-status color here — that meaning is reserved for the Dashboard app.

---

## 4. Architecture Split — Three Independent Websites

### 4.1 Repo/project structure
```
ARACHNEAI/
├── backend/                     (unchanged — single FastAPI service)
│   └── app/routers/
│       ├── target.py             ← Crestwood College's own API (auth, courses, students, admin tools)
│       ├── simulation.py          ← Attacker Console calls this
│       └── dashboard.py, incident.py, ai.py, reports.py  ← Security Dashboard calls these
├── sites/
│   ├── college-site/              ← NEW standalone frontend project (Vite/React), port 3000
│   ├── attacker-console/            ← NEW standalone frontend project, port 3001
│   └── security-dashboard/            ← your existing frontend, relocated here, port 3002
├── attack-simulator/                    (unchanged, called by simulation.py)
├── deception-engine/                      (unchanged)
├── ai-engine/                               (unchanged)
└── infrastructure/
    └── docker-compose.yml                     ← now runs 4 services: backend, college-site, attacker-console, security-dashboard
```

**Why one backend, three frontends** (reiterated because it's the crux of the whole restructuring): the backend's route *groups* already give you the separation that matters — `target.py` is "what the college's own systems expose," everything else is "what only the platform/attacker tooling can reach." Splitting the backend itself into three services would add real deployment complexity (three sets of env vars, three CORS configs, inter-service auth) for a 24-hour build with no functional benefit — the three-*frontend* split is what judges actually see and is where the "distinct people" illusion lives.

### 4.2 `docker-compose.yml` shape
```yaml
services:
  backend:
    build: ./backend
    ports: ["8001:8001"]
    environment: [GEMINI_API_KEY, JWT_SECRET, DATABASE_URL]

  college-site:
    build: ./sites/college-site
    ports: ["3000:3000"]
    environment: [VITE_API_URL=http://localhost:8001/api/v1/target]

  attacker-console:
    build: ./sites/attacker-console
    ports: ["3001:3001"]
    environment: [VITE_API_URL=http://localhost:8001/api/v1/simulation]

  security-dashboard:
    build: ./sites/security-dashboard
    ports: ["3002:3002"]
    environment: [VITE_API_URL=http://localhost:8001/api/v1]
```

### 4.3 Backend changes needed
1. **CORS:** allow origins `localhost:3000`, `:3001`, `:3002` explicitly in `main.py`.
2. **New `routers/target.py`** consolidating every endpoint listed in §3.3 — this is the single largest piece of new backend work, but it's additive (new file, new routes) not a rewrite of anything existing.
3. **`middleware/mitm_signature.py`** (new, small) for §2.10's header-based detection.
4. **Cache layer for §2.14** — a small in-memory dict is sufficient; don't reach for a real caching library, the vulnerability is in the *logic*, not the storage mechanism.
5. Everything in `services/`, `models/`, `ai-engine/`, `deception-engine/` stays as-is — they already consume telemetry events generically regardless of which router produced them.

### 4.4 Migration steps from your current single-frontend build
1. Move your existing frontend folder to `sites/security-dashboard/` (no functional changes needed yet — just relocate + confirm it still points at the backend correctly).
2. Scaffold `sites/college-site/` and `sites/attacker-console/` as fresh Vite+React projects.
3. Add `routers/target.py` to the backend, starting with just `/auth/login`, `/auth/register`, `/courses`, `/students/{id}` — enough for the College Site's core pages and the first three attacks (Broken Auth, IDOR, XSS).
4. Build the College Site's public pages first (they don't depend on any attack logic) — this de-risks the "does it look like a real site" requirement early.
5. Layer in the remaining `target.py` endpoints attack-by-attack, following the order in §2.
6. Build the Attacker Console last — it's the thinnest of the three (mostly a scenario picker + log viewer against endpoints that already exist by this point).

---

## 5. Build Priority (from your current state)

1. Relocate existing dashboard frontend into `sites/security-dashboard/`, confirm still working.
2. Scaffold `sites/college-site/`; build public pages (§3.1 top half) with real seeded content.
3. Add `routers/target.py` with auth + courses + students; wire up real login/register on College Site.
4. Implement attacks in this order against the new routes: **IDOR → XSS → CSRF → File Upload → API mass-assignment → Session → SSRF (already have, verify it now targets `target.py`) → Command Injection → Deserialization → XXE → DNS/Redirect → Cache Poisoning → Supply Chain → MITM signature.**
5. Scaffold `sites/attacker-console/`; build scenario grid + launch + log pane against `simulation.py`.
6. Apply the glass/neumorphic dark-green system (§1) to the Security Dashboard; apply the editorial light/green system (§3.4) to the College Site; keep the Attacker Console terminal-styled per the previous guide.
7. Wire the three-state dashboard model (from the previous guide, §5) using the now-much-richer telemetry stream across all 13 new attack types.
