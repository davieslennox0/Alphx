"""x402 payment middleware for ALPHX FastAPI endpoints."""
import time
import hashlib
from functools import wraps
from typing import Callable

import requests
from fastapi import Request, HTTPException
from backend.config import CSPR_CLOUD_BASE_URL, CSPR_CLOUD_API_KEY, ORACLE_WALLET_PUBLIC_KEY

_verified_hashes: dict[str, float] = {}
HASH_TTL = 3600


def _clean_cache():
    now = time.time()
    expired = [k for k, v in _verified_hashes.items() if now - v > HASH_TTL]
    for k in expired:
        del _verified_hashes[k]


def verify_cspr_payment(tx_hash: str, expected_amount_motes: int) -> bool:
    if not tx_hash:
        return False

    cache_key = hashlib.sha256(f"{tx_hash}:{expected_amount_motes}".encode()).hexdigest()
    if cache_key in _verified_hashes:
        return True

    if not CSPR_CLOUD_API_KEY or not CSPR_CLOUD_BASE_URL:
        return False

    try:
        headers = {"authorization": CSPR_CLOUD_API_KEY}
        # Casper 2.0 uses /transactions/, fall back to /deploys/ for 1.x
        for endpoint in [f"transactions/{tx_hash}", f"deploys/{tx_hash}"]:
            resp = requests.get(
                f"{CSPR_CLOUD_BASE_URL}/{endpoint}",
                headers=headers,
                timeout=10,
            )
            if resp.status_code == 200:
                break
        else:
            return False

        data = resp.json()

        # Casper 2.0 transaction shape
        transfer = (
            data.get("transaction", {})
            .get("body", {})
            .get("args", {})
        ) or (
            # Casper 1.x deploy shape
            data.get("session", {})
            .get("Transfer", {})
        )

        # Check execution success
        execution = data.get("execution_results", [{}])[0].get("result", {})
        if execution.get("Failure"):
            return False

        recipient = (
            data.get("transaction", {}).get("body", {}).get("target", "")
            or transfer.get("target", "")
        )
        amount_str = str(transfer.get("amount", "0"))
        amount = int(amount_str) if amount_str.isdigit() else 0

        if recipient.lower() == ORACLE_WALLET_PUBLIC_KEY.lower() and amount >= expected_amount_motes:
            _clean_cache()
            _verified_hashes[cache_key] = time.time()
            return True

        return False
    except Exception:
        return False


def payment_required(amount_cspr: float = 0.001):
    """Decorator factory for x402 payment-gated endpoints."""
    amount_motes = int(amount_cspr * 1_000_000_000)

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            tx_hash = request.headers.get("X-PAYMENT-SIGNATURE", "")

            if not tx_hash or not verify_cspr_payment(tx_hash, amount_motes):
                raise HTTPException(
                    status_code=402,
                    detail={
                        "error": "Payment required",
                        "accepts": [
                            {
                                "network": "casper-test",
                                "asset": "CSPR",
                                "amount": str(amount_cspr),
                                "amount_motes": str(amount_motes),
                                "recipient": ORACLE_WALLET_PUBLIC_KEY or "NOT_CONFIGURED",
                            }
                        ],
                    },
                )

            return await func(request, *args, **kwargs)

        return wrapper

    return decorator
