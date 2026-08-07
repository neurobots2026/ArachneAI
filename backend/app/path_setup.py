import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

for sub in ("", "ai-engine", "deception-engine", "attack-simulator"):
    path = REPO_ROOT / sub if sub else REPO_ROOT
    path_str = str(path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)
