# ArachneAI Backend

FastAPI backend for the ArachneAI deception-powered threat detection platform.

## Quick Start

```bash
cd backend
pip install -r requirements.txt
cd ..
python database/seed_data.py
cd backend
uvicorn app.main:app --reload --port 8001
```

## Demo Credentials

- Platform analyst: `secops@crestwood.edu` / `secops123`
- College admin: `admin@crestwood.edu` / `Admin2024!`
- College student: `student1@crestwood.edu` / `Student2024!`

## API

All routes under `/api/v1/` — see implementation guide for full route list.

## Tests

```bash
cd backend
pytest tests/ -v
```
