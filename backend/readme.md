# ArachneAI Backend

FastAPI backend for the ArachneAI deception-powered threat detection platform.

## Quick Start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --reload --port 8001
```

The FastAPI lifespan creates and incrementally backfills the Crestwood demo
dataset. Do not run the legacy `database/seed_data.py`; it belongs to the older
single-organization prototype.

## Demo Credentials

- Platform analyst: `secops@crestwood.edu` / `secops123`
- College admin: `admin@crestwood.edu` / `Admin2024!`
- College student: `student1@crestwood.edu` / `Student2024!`

## API

All routes under `/api/v1/` — see implementation guide for full route list.

## Tests

```bash
source .venv/bin/activate
pytest backend/tests/ -v
```

With the backend running, validate all 15 safe scenarios from the repository
root using `python scripts/e2e_test.py`. The script resets simulation-tagged
events afterward by default; set `ARACHNE_RESET_AFTER_TEST=0` to keep them for
manual inspection.
