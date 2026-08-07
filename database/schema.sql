-- ArachneAI schema (mirrors SQLAlchemy models)

CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT NOT NULL,
    employee_count INTEGER DEFAULT 0,
    cloud_provider TEXT DEFAULT '',
    departments JSON,
    deception_strategy JSON,
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    email TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    role TEXT DEFAULT 'analyst',
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS honeytokens (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    fake_value TEXT NOT NULL,
    department TEXT DEFAULT '',
    placement_path TEXT DEFAULT '',
    created_by_ai_reasoning TEXT DEFAULT '',
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telemetry_events (
    id TEXT PRIMARY KEY,
    honeytoken_id TEXT NOT NULL REFERENCES honeytokens(id),
    source_ip TEXT,
    user_agent TEXT,
    endpoint TEXT,
    http_method TEXT,
    timestamp TIMESTAMP,
    session_id TEXT,
    raw_metadata JSON
);

CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    telemetry_event_id TEXT NOT NULL REFERENCES telemetry_events(id),
    status TEXT DEFAULT 'open',
    attack_type TEXT DEFAULT 'Unknown',
    risk_score REAL DEFAULT 0.0,
    confidence_score REAL DEFAULT 0.0,
    ai_reasoning TEXT DEFAULT '',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attack_simulations (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    scenario_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    resulting_incident_id TEXT REFERENCES incidents(id)
);

CREATE TABLE IF NOT EXISTS ai_investigations (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES incidents(id),
    agent_name TEXT NOT NULL,
    input_summary TEXT DEFAULT '',
    output_summary TEXT DEFAULT '',
    status TEXT DEFAULT 'running',
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommendations (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES incidents(id),
    action TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    approved_by TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES incidents(id),
    file_path TEXT NOT NULL,
    generated_at TIMESTAMP
);
