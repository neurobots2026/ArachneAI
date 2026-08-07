ATTACK_TYPES = [
    "XSS",
    "CSRF",
    "Broken Auth",
    "IDOR",
    "Command Injection",
    "SSRF",
    "File Upload",
    "API Abuse",
    "Session Attack",
    "MITM",
    "DNS/Redirect",
    "Deserialization",
    "XXE",
    "Cache Poisoning",
    "Supply Chain",
]

HONEYTOKEN_TYPES = ["credential", "document", "source_code", "cloud", "api"]

INCIDENT_STATUSES = ["open", "investigating", "contained", "closed"]

RECOMMENDATION_ACTIONS = [
    "block_ip",
    "rotate_credential",
    "disable_user",
    "isolate_resource",
    "notify_soc",
    "block_source_ip",
]

CONTAINMENT_MAP = {
    "Broken Auth": ["rotate_credential", "block_source_ip"],
    "SSRF": ["block_source_ip", "isolate_resource"],
    "IDOR": ["disable_user", "notify_soc"],
    "XSS": ["block_source_ip", "notify_soc"],
    "CSRF": ["block_source_ip", "notify_soc"],
    "Command Injection": ["block_source_ip", "isolate_resource"],
    "File Upload": ["block_source_ip", "isolate_resource"],
    "API Abuse": ["block_source_ip", "rotate_credential"],
    "Session Attack": ["disable_user", "rotate_credential"],
    "MITM": ["notify_soc", "block_source_ip"],
    "DNS/Redirect": ["block_source_ip", "notify_soc"],
    "Deserialization": ["isolate_resource", "block_source_ip"],
    "XXE": ["isolate_resource", "block_source_ip"],
    "Cache Poisoning": ["block_source_ip", "notify_soc"],
    "Supply Chain": ["notify_soc", "rotate_credential"],
}
