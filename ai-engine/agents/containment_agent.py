from tools import CONTAINMENT_MAP


def run(threat: dict) -> dict:
    attack_type = threat.get("attack_type", "Broken Auth")
    actions = CONTAINMENT_MAP.get(attack_type, ["notify_soc", "block_source_ip"])
    return {
        "agent": "containment",
        "recommendations": [{"action": a, "status": "pending"} for a in actions],
    }
