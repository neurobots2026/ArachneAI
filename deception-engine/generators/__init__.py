import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generators.credential_generator import (
    generate_api_key,
    generate_fake_aws_key,
    generate_fake_jwt,
    generate_source_code_snippet,
)
from generators.document_generator import generate_fake_payroll_xlsx


def generate_honeytoken_content(token_type: str, name: str, org_name: str, department: str, marker: str):
    if token_type in ("credential", "cloud"):
        return generate_fake_aws_key(marker), "text/plain"
    if token_type == "api":
        return generate_api_key(marker), "text/plain"
    if token_type == "source_code":
        return generate_source_code_snippet(marker), "text/plain"
    if token_type == "document":
        content = generate_fake_payroll_xlsx(org_name, department, marker)
        return content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return generate_fake_jwt({"marker": marker}), "text/plain"
