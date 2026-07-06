"""CSPR.cloud REST API wrapper."""
import requests
from backend.config import CSPR_CLOUD_BASE_URL, CSPR_CLOUD_API_KEY, CASPER_NODE_URL


def _headers() -> dict:
    return {"authorization": CSPR_CLOUD_API_KEY} if CSPR_CLOUD_API_KEY else {}


def get_deploy(deploy_hash: str) -> dict | None:
    try:
        resp = requests.get(
            f"{CSPR_CLOUD_BASE_URL}/transactions/{deploy_hash}",
            headers=_headers(),
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception:
        return None


def get_account_balance(public_key: str) -> int:
    """Returns balance in motes."""
    try:
        resp = requests.get(
            f"{CSPR_CLOUD_BASE_URL}/accounts/{public_key}",
            headers=_headers(),
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            return int(data.get("balance", "0"))
        return 0
    except Exception:
        return 0


def get_block_height() -> int:
    try:
        resp = requests.post(
            CASPER_NODE_URL,
            json={"id": 1, "jsonrpc": "2.0", "method": "chain_get_block", "params": []},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("result", {}).get("block", {}).get("header", {}).get("height", 0)
        return 0
    except Exception:
        return 0
