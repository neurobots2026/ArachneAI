# ArachneAI — Complete Implementation Guide
### Mapped to your actual repo structure, with per-file logic

This guide walks through **every folder in your screenshot** in the order data actually flows through the system, and for each file explains: what it's for, what functions/classes go in it, and the *basic logic* (not just the name). Read it top to bottom once, then use it as a reference while coding.

---

## 0. How to Read This Repo (mental model first)

```
ARACHNEAI/
├── ai-engine/            → the "brain" (Gemini + LangGraph multi-agent system)
├── assets/               → static demo assets (fake logos, sample doc templates)
├── attack-simulator/      → scripts that fire safe attacks at the Target App
├── backend/               → FastAPI app — the only thing everything else talks through
│   └── app/
│       ├── config/        → settings & environment loading
│       ├── core/          → auth, security, dependency injection, exception handlers
│       ├── database/      → DB engine/session setup (connects to database/ folder)
│       ├── middleware/     → cross-cutting request handling
│       ├── models/         → SQLAlchemy ORM tables
│       ├── routers/        → API endpoints (thin — just call services)
│       ├── schemas/        → Pydantic request/response shapes
│       ├── services/       → actual business logic
│       └── utils/          → small helpers
├── database/              → DB init scripts / migrations / seed data
├── deception-engine/       → honeytoken creation & tracking logic
├── Docs/                   → architecture docs, diagrams
├── frontend/                → React dashboard + company explorer
├── infrastructure/           → Docker/Compose/deployment
└── reports/                  → report templates & generated PDFs
```

**The golden rule for this whole codebase:** `routers/` never contains logic — it only validates input (via `schemas/`) and calls a function in `services/`. `services/` is where real logic lives and is the only layer allowed to call `ai-engine/`, `deception-engine/`, or `models/`. This keeps every file small and testable, which matters a lot when 4–5 people are editing this repo simultaneously during a hackathon.

---

## 1. `backend/app/config/`

**Purpose:** One place that reads environment variables and hackathon-wide constants, so nothing else in the codebase calls `os.getenv()` directly.

**`settings.py`** (the only real file you need here)
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "ArachneAI"
    ENV: str = "development"
    DATABASE_URL: str = "sqlite:///./arachneai.db"
    GEMINI_API_KEY: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24
    TARGET_APP_URL: str = "http://localhost:9000"   # the sandboxed vulnerable app

    class Config:
        env_file = ".env"

settings = Settings()
```
**Logic:** Instantiated once, imported everywhere else as `from app.config.settings import settings`. This is what lets `GEMINI_API_KEY` live in one `.env` file instead of being hunted through the codebase.

---

## 2. `backend/app/core/`

This is where the *rules* of the app live — not data, not routes, but "how are we allowed to act."

**`security.py`**
- `hash_password(password: str) -> str` — bcrypt/passlib hashing.
- `verify_password(plain, hashed) -> bool`
- `create_access_token(data: dict) -> str` — builds a JWT with `settings.JWT_SECRET`.
- `decode_access_token(token: str) -> dict` — verifies and decodes; raises on invalid/expired.

**`dependencies.py`**
- `get_current_user(token: str = Depends(oauth2_scheme)) -> User` — the function every protected router route depends on. Logic: decode JWT → look up user in DB → attach `organization_id` to the request context → return the user object or raise `401`.
- `get_db() -> Session` — yields a DB session per request, closes it after (standard SQLAlchemy pattern).

**`exceptions.py`**
- Custom exception classes: `NotFoundError`, `UnauthorizedError`, `InvalidHoneytokenError`.
- Registered globally in `main.py` so any router can `raise NotFoundError("Incident not found")` and get a consistent JSON error response instead of a raw 500.

**Basic logic to remember:** `core/` answers "is this request allowed to happen at all" — it runs *before* any service logic, on every request that needs it.

---

## 3. `backend/app/database/`

**Purpose:** The connection layer only — not the schema itself (that's the `database/` root folder and `models/`).

**`session.py`**
```python
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()
```
**`init_db.py`** — called once at startup: `Base.metadata.create_all(bind=engine)`. For a 24h hackathon, this replaces a full migration tool (Alembic is optional, skip it unless you have spare time).

---

## 4. `backend/app/middleware/`

**Purpose:** Code that wraps *every* request, regardless of which router handles it.

- **`logging_middleware.py`** — logs method, path, status code, latency for every request. This becomes genuinely useful telemetry for your own debugging during the hackathon.
- **`error_handler.py`** — catches unhandled exceptions, returns a clean JSON `{ "error": "..." }` instead of a stack trace leaking to the frontend.
- **`request_id_middleware.py`** (optional but cheap) — attaches a UUID to each request so you can trace one request's full log trail; useful when demoing "here's the exact request that triggered this incident."

**Logic:** registered in `main.py` with `app.add_middleware(...)` in the order: request-id → logging → error handling → auth-adjacent middleware if any.

---

## 5. `backend/app/models/` (SQLAlchemy — the actual database shape)

Each file = one table, matching the `database/` doc's table list.

**`organization.py`**
```python
class Organization(Base):
    id, name, industry, employee_count, cloud_provider,
    departments (JSON list), created_at
```

**`user.py`**
```python
class User(Base):
    id, organization_id (FK), email, hashed_password, role, created_at
```

**`honeytoken.py`**
```python
class Honeytoken(Base):
    id, organization_id (FK), type (credential/document/source_code/cloud/api),
    name, fake_value (the actual bait content, e.g. a fake AWS key string),
    department, placement_path, created_by_ai_reasoning (text), created_at
```
**Logic note:** `fake_value` or a derived unique marker inside it is what the Deception Engine watches for. Every honeytoken must have something *uniquely identifiable* — never reuse the same fake string across two tokens, or you can't tell which one was touched.

**`telemetry_event.py`**
```python
class TelemetryEvent(Base):
    id, honeytoken_id (FK), source_ip, user_agent, endpoint, http_method,
    timestamp, session_id, raw_metadata (JSON)
```

**`incident.py`**
```python
class Incident(Base):
    id, organization_id (FK), telemetry_event_id (FK), status
    (open/investigating/contained/closed), attack_type, risk_score,
    confidence_score, ai_reasoning (text), created_at, updated_at
```

**`attack_simulation.py`**
```python
class AttackSimulation(Base):
    id, organization_id (FK), scenario_name, status, started_at, finished_at,
    resulting_incident_id (FK, nullable)
```

**`ai_investigation.py`**
```python
class AIInvestigation(Base):
    id, incident_id (FK), agent_name, input_summary, output_summary,
    status (running/completed/failed), started_at, completed_at
```
**Logic note:** one row per agent per incident — this table is literally what powers the "Live Agent Conversation" UI feature (Module 2.6/2.10 in the previous guide). Each agent writes a row when it starts and updates it when it finishes; the frontend polls this table to show "Coordinator: running… Telemetry: completed… Reasoning: running…" live.

**`recommendation.py`**
```python
class Recommendation(Base):
    id, incident_id (FK), action (block_ip/rotate_credential/disable_user/...),
    status (pending/approved/rejected/executed), approved_by (user_id, nullable)
```

**`report.py`**
```python
class Report(Base):
    id, incident_id (FK), file_path, generated_at
```

---

## 6. `backend/app/schemas/` (Pydantic — API contracts)

One-to-one mirror of `models/`, but shaped for API in/out rather than DB storage. Key distinction to enforce: **never return a raw SQLAlchemy model from a router** — always convert to a `*Response` schema, so you control exactly what's exposed (e.g. never leak `hashed_password`).

Examples:
```python
class CreateOrganizationRequest(BaseModel):
    name: str
    industry: str
    employee_count: int
    cloud_provider: str
    departments: list[str]

class OrganizationResponse(BaseModel):
    id: str
    name: str
    industry: str
    class Config: from_attributes = True

class HoneytokenResponse(BaseModel):
    id: str
    type: str
    name: str
    department: str
    placement_path: str
    # NOTE: never return fake_value in list views — only when explicitly
    # fetching one token for demo/inspection purposes.

class IncidentResponse(BaseModel):
    id: str
    attack_type: str
    risk_score: float
    confidence_score: float
    status: str
    ai_reasoning: str
    telemetry: TelemetryResponse
    recommendations: list[RecommendationResponse]
```
**Logic:** `schemas` are what make your routers "thin" — a router just does `request: CreateOrganizationRequest` in its signature and FastAPI validates automatically before your code even runs.

---

## 7. `backend/app/routers/` (thin endpoint layer)

Each file corresponds 1:1 to the API section in your original doc. Basic logic pattern for **every** route:
```python
@router.post("/honeytokens", response_model=HoneytokenResponse)
def create_honeytoken(req: CreateHoneytokenRequest,
                       db: Session = Depends(get_db),
                       user = Depends(get_current_user)):
    return honeytoken_service.create_honeytoken(db, user.organization_id, req)
```
That's it — no business logic, no direct DB queries, no direct Gemini calls. Just: validate → call service → return.

Key routers and their one real responsibility each:
- `auth.py` — register/login/me. Calls `auth_service`.
- `organization.py` — CRUD for org profile.
- `dashboard.py` — read-only aggregate endpoints (`/summary`, `/threats`, `/activity`) that call `incident_service` / `telemetry_service` and return pre-aggregated numbers so the frontend doesn't have to compute stats client-side.
- `honeytoken.py` — create/list/get/delete honeytokens.
- `deception.py` — `/deception/analyze` (calls AI strategist) and `/deception/generate` (turns strategy into real honeytoken rows).
- `telemetry.py` — receives events (this is the endpoint the Deception Engine calls internally when a honeytoken is touched) and lists them.
- `incident.py` — list/get incidents, `/investigate` (kicks off the AI pipeline), `/contain` (records human approve/reject).
- `ai.py` — lower-level AI endpoints if you want to expose individual agent calls for debugging (`/ai/investigate`, `/ai/analyze-threat`).
- `simulation.py` — `/simulation/start`, `/simulation/{id}` — starts and polls an attack simulation run.
- `reports.py` — `/reports/generate`, `/reports`, `/reports/{id}`.

---

## 8. `backend/app/services/` (the real logic)

This is the layer worth spending the most design attention on. One file per domain, matching routers 1:1.

### `auth_service.py`
- `register_user(db, email, password, org_id)` → hash password → create `User` row.
- `authenticate_user(db, email, password)` → fetch user → `verify_password` → if valid, `create_access_token`.

### `organization_service.py`
- `create_organization(db, data)` → simple insert, return row.
- `get_organization(db, org_id)` → fetch or raise `NotFoundError`.

### `honeytoken_service.py`
- `create_honeytoken(db, org_id, data)`:
  1. Generate the actual fake content (delegates to `deception-engine/generators/`).
  2. Insert a `Honeytoken` row with a unique embedded marker.
  3. Return it.
- `list_honeytokens(db, org_id)` → simple query, but **strip `fake_value`** from the response for anything other than a single-item detail view.

### `deception_service.py` (AI Deception Strategist glue)
- `analyze_organization(db, org_id)`:
  1. Load `Organization`.
  2. Build a structured prompt from its fields.
  3. Call `ai-engine`'s deception-strategist function, requesting **strict JSON output** matching a `DeceptionStrategy` schema (assets, honeytoken types, placement, one-paragraph justification).
  4. Store the raw strategy (e.g. in a `deception_strategies` table or just cached on the org row as JSON) so the report generator can quote the AI's justification later.
- `generate_from_strategy(db, org_id, strategy)` → loops the strategy's recommended tokens and calls `honeytoken_service.create_honeytoken` for each.

### `telemetry_service.py`
- `record_event(db, honeytoken_id, request_metadata)`:
  1. Insert `TelemetryEvent`.
  2. Call `incident_service.create_incident_from_event(...)` — **this is the trigger point of the entire reactive pipeline.** Every downstream module (AI investigation, dashboard update, report) ultimately starts from this one function call.

### `incident_service.py`
- `create_incident_from_event(db, event)` → insert `Incident` with `status="open"`, then **kick off** (sync call or background task) `ai_service.investigate(incident_id)`.
- `approve_recommendation(db, recommendation_id, user_id)` → update `Recommendation.status = "approved"`, update `Incident.status = "contained"`, log a fake "action executed" telemetry note (never call anything real).

### `ai_service.py`
- `investigate(db, incident_id)`:
  1. Load incident + related telemetry + honeytoken + org.
  2. Call the LangGraph graph in `ai-engine/` with this bundled context.
  3. As each agent in the graph finishes, write/update an `AIInvestigation` row (so the "live agent" UI has something to poll).
  4. On completion, update `Incident` with `attack_type`, `risk_score`, `confidence_score`, `ai_reasoning`.
  5. Create `Recommendation` row(s) from the Containment Agent's output.

### `report_service.py`
- `generate_report(db, incident_id)`:
  1. Gather incident + telemetry + AI investigation trail + recommendations.
  2. Render into `reports/incident_templates/` (a Jinja2 HTML template) → convert to PDF (WeasyPrint) → save to `reports/generated_reports/`.
  3. Insert a `Report` row with the file path.

**Basic logic to internalize:** `telemetry_service.record_event()` is the single ignition point of the whole reactive chain. Everything from "AI investigates" to "dashboard lights up" to "report becomes generatable" is a consequence of that one function being called. Test that function path first — it's your MVP spine.

---

## 9. `backend/app/utils/`

Small, boring, and easy to forget until you need them:
- `id_generator.py` — `generate_id(prefix: str) -> str` → e.g. `ht_ab12cd34` for honeytokens, `inc_...` for incidents. Consistent, readable IDs make live demos much easier to narrate ("see, `ht_aws01` just got touched").
- `datetime_utils.py` — consistent UTC timestamp formatting used across telemetry/incident/report.
- `hashing.py` — for anything that needs a quick hash (e.g. deduplicating identical telemetry events).
- `validators.py` — small reusable input checks not worth a full Pydantic validator.

---

## 10. `backend/app/__init__.py` and `backend/Dockerfile`

- `__init__.py` — usually just marks the package; `main.py` (create if missing) is where `FastAPI()` is instantiated, routers are `include_router()`-ed, and middleware/exception handlers registered.
- `Dockerfile` — standard Python slim image, `pip install -r requirements.txt`, `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

---

## 11. `backend/tests/`

Don't over-invest here given 24 hours, but at minimum:
- One test that hits `telemetry_service.record_event` directly and asserts an `Incident` gets created — this is your most valuable single test because it protects the spine described above.
- One test for `auth_service` (register + login roundtrip).

---

## 12. `database/` (root-level — schema & seed, distinct from `backend/app/database/`)

- **`schema.sql`** (optional if you rely on SQLAlchemy `create_all`, but useful for judges/docs to see the shape at a glance) — plain CREATE TABLE statements mirroring `models/`.
- **`seed_data.py`** — a script you run once to pre-populate: one demo `Organization` ("Acme Bank"), a demo admin `User`, and optionally a couple of pre-seeded honeytokens — so the dashboard isn't empty at the very start of a demo if the strategist call is slow/rate-limited.
- **`migrations/`** (skip Alembic for a hackathon unless a teammate is already fluent in it — `create_all()` at startup is enough).

---

## 13. `deception-engine/` (the heart of the "deception" idea)

```
deception-engine/
├── honeytokens/     → definitions of what a honeytoken record looks like per type
├── generators/       → functions that produce believable fake content
├── deployment/        → places generated tokens into the Target App (writes files, seeds API responses, etc.)
├── telemetry/          → the "watcher" logic that detects when a honeytoken is touched
├── templates/           → base templates for fake documents (Payroll.xlsx skeleton, .env skeleton)
└── strategies/            → the adaptive logic (org profile → token type weighting)
```

**`generators/credential_generator.py`**
- `generate_fake_aws_key() -> str` — format-correct-looking but non-functional (`AKIA` + random alnum), embeds a unique tracking suffix internally recorded in the DB, never a real/working credential.
- `generate_fake_jwt(claims: dict) -> str` — a JWT signed with a throwaway local secret, never your real `JWT_SECRET`.

**`generators/document_generator.py`**
- `generate_fake_payroll_xlsx(org_name, department) -> bytes` — uses `openpyxl` to build a plausible-looking spreadsheet with fabricated names/salaries; embeds a hidden unique cell value or filename token used for tracking access.

**`deployment/target_app_deployer.py`**
- `deploy_credential(org_id, honeytoken) -> None` — writes the fake credential into wherever the Target App exposes it (e.g. a `.env`-style file the Target App serves, or a fake "internal docs" page).
- `deploy_document(org_id, honeytoken) -> None` — places a generated file into the Target App's file-serving directory (this is what the Company Explorer module lists).

**`telemetry/watcher.py`**
- The actual detection logic. Two practical approaches for a hackathon (pick one, don't overbuild):
  1. **Access-logging approach:** the Target App logs every file/API access; a lightweight poller or the Target App itself calls back to `POST /api/v1/telemetry/events` whenever a request path/value matches a known honeytoken marker.
  2. **Direct-callback approach (simpler, recommended):** honeytoken endpoints/files in the Target App are literally routes that, when hit, directly call the ArachneAI backend's telemetry endpoint before responding (fastest to build, fully deterministic, ideal under time pressure).

**`strategies/adaptive_strategy.py`**
- `weight_honeytoken_types(org: Organization) -> dict`:
  ```python
  weights = {"credential": 1, "document": 1, "source_code": 1, "cloud": 1}
  if "Developers" in org.departments: weights["source_code"] += 2; weights["credential"] += 1
  if org.industry in ("Banking", "Finance"): weights["document"] += 2; weights["credential"] += 1
  if org.cloud_provider: weights["cloud"] += 2
  return weights
  ```
  This is the concrete, deterministic backbone underneath the "AI decides adaptively" story — the Gemini call adds the *justification text and specific asset names*, but a simple weighting function like this makes the behavior reliable and demo-safe even if the LLM call is slow or briefly rate-limited.

---

## 14. `ai-engine/`

```
ai-engine/
├── agents/
│   ├── coordinator.py
│   ├── telemetry_agent.py
│   ├── threat_intel_agent.py
│   ├── reasoning_agent.py
│   ├── containment_agent.py
│   └── security_advisor.py
├── graph.py           → LangGraph wiring of the above
├── tools.py            → the callable tools agents use
├── prompts/              → one prompt template file per agent
└── client.py               → thin Gemini API wrapper
```

**`client.py`**
```python
def call_gemini(prompt: str, response_schema: type[BaseModel]) -> BaseModel:
    # calls Gemini with JSON-mode / structured output constrained to response_schema
    # parses and validates the response against the Pydantic schema
    # retries once on malformed JSON before raising
```
**Logic:** every agent goes through this one function — centralizing retries and schema validation here means you fix "Gemini returned bad JSON" bugs in exactly one place.

**`tools.py`** — plain Python functions agents can call:
```python
def get_telemetry(event_id): ...
def get_honeytoken(honeytoken_id): ...
def get_incident_history(org_id): ...
def classify_attack(evidence: dict) -> str: ...
def calculate_risk(evidence: dict) -> float: ...
```

**`agents/coordinator.py`**
- `run(incident_context: dict) -> dict`:
  1. Calls `telemetry_agent.run()`, `threat_intel_agent.run()` (can run concurrently).
  2. Passes their outputs into `reasoning_agent.run()`.
  3. Passes reasoning output into `containment_agent.run()`.
  4. Passes everything into `security_advisor.run()`.
  5. Returns a merged result dict matching what `ai_service.investigate()` expects to store.

**`agents/threat_intel_agent.py`** — logic: build a prompt containing telemetry + honeytoken metadata, ask Gemini to pick from a **fixed enum** of attack categories (`XSS, CSRF, Broken Auth, IDOR, Command Injection, SSRF, File Upload, API Abuse, Session Attack, MITM, DNS/Redirect, Deserialization, XXE, Cache Poisoning, Supply Chain`) plus a confidence score — constraining to a fixed enum (rather than free text) makes downstream code (dashboard badges, report formatting) trivial and reliable.

**`agents/reasoning_agent.py`** — logic: given the classification + evidence, ask Gemini to produce a **numbered evidence list** (3–5 bullet points) explaining why this is malicious — this is what gets displayed as "AI Reasoning" and quoted in the report; keep the prompt explicit: *"Return only factual evidence-based bullet points, no speculation beyond the provided data."*

**`agents/containment_agent.py`** — logic: map attack_type → a **fixed lookup table** of recommended actions (not another free-form LLM call — deterministic and safer):
```python
CONTAINMENT_MAP = {
    "Broken Auth": ["rotate_credential", "block_source_ip"],
    "SSRF": ["block_source_ip", "isolate_resource"],
    "IDOR": ["disable_user", "notify_soc"],
    # ...
}
```
Optionally have Gemini pick/rank among these rather than invent free actions — keeps containment options bounded and safe to display with Approve/Reject buttons.

**`agents/security_advisor.py`** — logic: given everything above, ask Gemini for a short business-impact summary paragraph (2–3 sentences) for the report — this is the only agent whose output is prose rather than structured data, and it's the last step.

**`graph.py`** — wires the above into a LangGraph `StateGraph` with the flow: `coordinator → [telemetry, threat_intel] → reasoning → containment → security_advisor → END`. Even a straightforward sequential Python function chain is acceptable if LangGraph setup time runs short — the important thing for judges is the **separation into distinct specialized steps with tool access**, not the specific orchestration library.

---

## 15. `attack-simulator/`

```
attack-simulator/
├── scenarios/
│   ├── xss_scenario.py
│   ├── csrf_scenario.py
│   ├── broken_auth_scenario.py
│   ├── idor_scenario.py
│   ├── command_injection_scenario.py
│   ├── ssrf_scenario.py
│   ├── file_upload_scenario.py
│   ├── api_abuse_scenario.py
│   ├── session_attack_scenario.py
│   ├── mitm_scenario.py
│   ├── dns_redirect_scenario.py
│   ├── deserialization_scenario.py
│   ├── xxe_scenario.py
│   ├── cache_poisoning_scenario.py
│   └── supply_chain_scenario.py
└── runner.py
```

Each scenario file follows the **same shape** (consistency here saves huge time):
```python
def run(target_app_url: str, org_id: str) -> dict:
    # 1. build the specific malicious-looking request(s) for this attack type
    # 2. send it to the sandboxed Target App
    # 3. return a small summary dict {"scenario": "...", "status": "sent"}
    # (it does NOT need to know about honeytokens directly —
    #  the Target App + deception-engine watcher handles detection)
```
**`runner.py`** — `POST /simulation/start` in the backend calls into this, which looks up the requested scenario by name and calls its `run()`; updates `AttackSimulation.status` to `running` then `completed`, and links `resulting_incident_id` if a telemetry event/incident appeared within a short polling window after the scenario ran.

Refer back to **Section 4 of your previous guide** ("Mapping the 15 attacks to safe simulations") for the exact payload logic per scenario — that table is your spec for what each of these 15 files actually does.

---

## 16. `frontend/`

Not expanded file-by-file here since your screenshot didn't show its internals, but the three screens that matter, in build order:
1. **Dashboard** — reads `/dashboard/summary`, `/dashboard/threats`, `/dashboard/activity`; polls `/incidents` for live updates.
2. **Company Explorer** — reads `/honeytokens` (list view, no `fake_value`) rendered as a folder tree by `department`/`placement_path`.
3. **Incident Detail / Attack Replay** — reads one `/incidents/{id}` (which should embed telemetry + AI investigation trail + recommendations in one response, per the `IncidentResponse` schema above) and renders it as a timeline.

---

## 17. `infrastructure/`

- **`docker-compose.yml`** — services: `backend`, `frontend`, `target-app`, (SQLite is just a mounted file, no separate DB container needed). Keep `attack-simulator` runnable either as its own container or as a script invoked from the backend — either works, pick whichever is faster to wire up.
- Env vars (`GEMINI_API_KEY`, `JWT_SECRET`, `TARGET_APP_URL`) passed via `.env` referenced in the compose file, never hardcoded.

---

## 18. `reports/`

- `incident_templates/incident_report.html` — Jinja2 template with placeholders for attack type, timeline, evidence bullets, AI reasoning, recommendations, business-impact paragraph.
- `report_service.generate_report()` (§8 above) renders this template and converts to PDF, saving into `generated_reports/`.

---

## 19. `Docs/`

Keep this current as you build — it's low effort and directly helps your pitch:
- `architecture/system-architecture.md` — paste the diagrams from this guide.
- `api/` — your route list (already fully specified in the original doc).
- `diagrams/` — the end-to-end flow diagram, module interdependency diagram, and per-attack sequence diagrams if time allows.

---

## 20. The One Function Call That Proves the Whole System Works

If you build nothing else in order, build this path first, end to end, and demo it before adding breadth:

```
attack_simulator.scenarios.broken_auth_scenario.run()
        → Target App logs a failed/successful login against a honeytoken credential
        → Target App calls backend: telemetry_service.record_event()
        → incident_service.create_incident_from_event()
        → ai_service.investigate()  (even a single-agent version is fine as v1)
        → dashboard shows a red "CRITICAL INCIDENT" card
        → security engineer clicks Approve on the recommended containment
        → report_service.generate_report() produces a PDF
```

Everything else in this guide — the other 14 attack scenarios, the multi-agent split, the adaptive strategy weighting, MITRE mapping — is additive polish once this one chain is provably working.
