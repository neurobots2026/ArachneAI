import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
for p in (str(BACKEND), str(ROOT / "ai-engine"), str(ROOT / "deception-engine"), str(ROOT / "attack-simulator")):
    if p not in sys.path:
        sys.path.insert(0, p)
