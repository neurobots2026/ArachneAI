def weight_honeytoken_types(org) -> dict:
    weights = {"credential": 1, "document": 1, "source_code": 1, "cloud": 1, "api": 1}
    departments = org.departments or []
    if "Developers" in departments or "Engineering" in departments:
        weights["source_code"] += 2
        weights["credential"] += 1
    if org.industry in ("Banking", "Finance"):
        weights["document"] += 2
        weights["credential"] += 1
    if org.cloud_provider:
        weights["cloud"] += 2
    return weights
