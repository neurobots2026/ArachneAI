# Local v3 topology

`docker compose -f infrastructure/docker-compose.yml up --build` starts the
single FastAPI backend on `:8001` and the three deliberately independent
frontends on `:3000` (Crestwood College), `:3001` (Attacker Console), and
`:3002` (Security Dashboard). All attack traffic remains local to the backend;
the attack simulator only exercises fixed, simulated bait values.
