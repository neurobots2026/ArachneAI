"""Detect honeytoken access via marker matching in request metadata."""


def matches_honeytoken(endpoint: str, placement_path: str, fake_value: str) -> bool:
    if not placement_path:
        return False
    normalized_path = placement_path.lstrip("/")
    if normalized_path in endpoint or endpoint.endswith(normalized_path):
        return True
    if fake_value and fake_value[:16] in endpoint:
        return True
    return False
