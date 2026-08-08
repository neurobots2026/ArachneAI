# Local v3 topology

`docker compose -f infrastructure/docker-compose.yml up --build` starts the
single FastAPI backend on `:8001` and the three deliberately independent
frontends on `:3000` (Crestwood College), `:3001` (Attacker Console), and
`:3002` (Security Dashboard). All attack traffic remains local to the backend;
the attack simulator only exercises fixed, simulated bait values.

For local terminals instead of Docker, activate the root virtual environment,
then run these in four terminals:

```bash
npm run dev:backend
npm run dev:college
npm run dev:attacker
npm run dev:dashboard
```

Open `http://localhost:3000`, `http://localhost:3001`, and
`http://localhost:3002`. The platform/attacker login is
`secops@crestwood.edu` / `secops123`; the college demo credentials are listed
in `backend/readme.md`.
