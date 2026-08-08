# ArachneAI v3

ArachneAI is a local, deception-defense demonstration with three independent
websites backed by one FastAPI service:

| Website | Folder | URL | Role |
| --- | --- | --- | --- |
| Crestwood College | `sites/college-site` | `http://localhost:3000` | Organization target site |
| Attacker Console | `sites/attacker-console` | `http://localhost:3001` | Authorized attack simulator |
| Security Dashboard | `sites/security-dashboard` | `http://localhost:3002` | Defender/SOC console |
| FastAPI | `backend` | `http://localhost:8001` | Shared API and detection engine |

The attacker console supports all 15 scenarios from the v3 guide. Every
retrieved attacker artifact is synthetic or a honeytoken; organization records
stay inside authenticated Crestwood pages.

## Run locally

Install the Python and frontend dependencies once:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
npm run install:apps
```

Then use four terminals from this directory (activate `.venv` in the backend
terminal):

```bash
npm run dev:backend
npm run dev:college
npm run dev:attacker
npm run dev:dashboard
```

Alternatively:

```bash
docker compose -f infrastructure/docker-compose.yml up --build
```

Demo credentials:

- Defender and attacker operator: `secops@crestwood.edu` / `secops123`
- College student: `student1@crestwood.edu` / `Student2024!`
- College administrator: `admin@crestwood.edu` / `Admin2024!`

## Demo workflow

1. Open the Security Dashboard and show normal baseline traffic, armed
   honeytokens, and a standby honeypot.
2. Open the Attacker Console, choose one of the 15 scenarios, acknowledge the
   safety interlock, and launch it.
3. Watch the request trace, run progress, retrieved decoy files, and the
   `ORG_DATA_EXPOSED = FALSE` boundary in the attacker view.
4. Return to the dashboard. It moves through alert and investigation, links the
   correct incident, and records the adaptive honeypot deployment.
5. Review AI evidence, approve containment, and generate the report.
6. Use **Reset demo** in the defender header to restore normal state without
   deleting Crestwood organization data.

## Validate

```bash
source .venv/bin/activate
pytest backend/tests -q
npm run build:apps
python scripts/e2e_test.py
```

The end-to-end script runs all 15 scenarios, verifies attack classification,
incident correlation, deception actions, artifact retrieval, and the strict
data boundary, then resets simulation evidence. Set
`ARACHNE_RESET_AFTER_TEST=0` to retain a validation run for inspection.

All scenarios are fixed, local simulations. No arbitrary shell execution,
external interception, real package installation, or real organization-data
exfiltration is performed.
