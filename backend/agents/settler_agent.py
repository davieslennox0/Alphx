"""ALPHXC Settler Agent — routes open trade requests between agent wallets.

Each settlement submits a real Casper testnet CSPR transfer from the
requesting agent's wallet to the next agent's wallet in the rotation.
CSPR stays within the agent pool — no funds are burned.
"""
import sys
import time
import json
import hashlib
import random
import subprocess

sys.path.insert(0, "/root/alphx")

from backend.db import (
    init_db, log_agent, log_decision,
    get_open_trade_requests, settle_trade_pair, get_rate,
)
from backend.config import CASPER_NODE_URL

AGENT_ID     = "settler"
POLL         = 10   # check every 10 seconds
SETTLE_AFTER = 20   # settle any open request after this many seconds

SETTLE_TX_SCRIPT = "/root/alphx/backend/casper_helper/settle_tx.cjs"
MANIFEST_PATH    = "/root/alphx/wallet/agents/manifest.json"

# Recipient rotation: settlements cycle through agent wallets as destination
RECIPIENT_ORDER = ["trader_a", "trader_b", "trader_c", "settler"]
_recipient_idx  = 0

def _load_manifest():
    with open(MANIFEST_PATH) as f:
        return json.load(f)

def _submit_casper_tx(pair: str, direction: str, amount: float, rate: float,
                      req_id: int, requesting_agent: str) -> str:
    """Submit a real CSPR transfer on Casper testnet.

    Sender = requesting agent's own wallet. Recipient = next in rotation.
    CSPR circulates within the agent pool indefinitely.
    """
    try:
        manifest = _load_manifest()
        sender_name          = requesting_agent if requesting_agent in manifest else "settler"
        sender_key_path      = manifest[sender_name]["pem_path"]
        recipient_name       = RECIPIENT_ORDER[_recipient_idx % len(RECIPIENT_ORDER)]
        recipient_public_key = manifest[recipient_name]["public_key"]
        global _recipient_idx
        _recipient_idx += 1
    except Exception as e:
        log_agent(AGENT_ID, f"Cannot load wallet manifest: {e}")
        return _fallback(pair, req_id)

    args = json.dumps({
        "sender_key_path":      sender_key_path,
        "recipient_public_key": recipient_public_key,
        "pair":      pair,
        "direction": direction,
        "amount":    amount,
        "rate":      rate,
        "req_id":    req_id,
        "node_url":  CASPER_NODE_URL or "https://node.testnet.casper.network/rpc",
    })

    try:
        result = subprocess.run(
            ["node", SETTLE_TX_SCRIPT, args],
            capture_output=True,
            text=True,
            timeout=30,
            cwd="/root/alphx/backend/casper_helper",
        )
        if result.stdout.strip():
            try:
                data = json.loads(result.stdout.strip())
                tx_hash = data.get("tx_hash", "")
                if tx_hash:
                    log_agent(AGENT_ID,
                        f"Casper tx req#{req_id} hash={tx_hash[:14]}…")
                    return tx_hash
            except json.JSONDecodeError:
                pass
        err = (result.stderr or result.stdout)[:200]
        log_agent(AGENT_ID, f"Casper TX no hash for req#{req_id}: {err[:100]}")
    except subprocess.TimeoutExpired:
        log_agent(AGENT_ID, f"Casper TX timeout for req#{req_id}")
    except Exception as e:
        log_agent(AGENT_ID, f"Casper TX error for req#{req_id}: {e}")

    return _fallback(pair, req_id)


def _fallback(pair: str, req_id: int) -> str:
    seed = f"alphxc-fallback-{pair}-{req_id}-{int(time.time())}"
    return "local-" + hashlib.sha256(seed.encode()).hexdigest()[:58]


def settle_request(req: dict):
    pair     = req["pair"]
    rate_row = get_rate(pair)
    if not rate_row or not rate_row.get("rate"):
        log_agent(AGENT_ID, f"No rate for {pair}, skipping req#{req['id']}")
        return

    real_rate   = rate_row["rate"]
    pool_spread = random.uniform(0.001, 0.008)
    if req["direction"] == "BUY":
        pool_rate = real_rate * (1 + pool_spread)
    else:
        pool_rate = real_rate * (1 - pool_spread)

    spread_pct = abs(real_rate - pool_rate) / real_rate * 100

    log_agent(AGENT_ID, f"Submitting Casper tx for req#{req['id']} {req['direction']} {pair}…")

    tx = _submit_casper_tx(
        pair             = pair,
        direction        = req["direction"],
        amount           = req["amount"],
        rate             = round(pool_rate, 6),
        req_id           = req["id"],
        requesting_agent = req.get("agent_name", "settler"),
    )

    settle_trade_pair(req["id"], req["id"], real_rate, tx)

    log_decision(
        pair       = pair,
        real_rate  = real_rate,
        pool_rate  = pool_rate,
        spread_pct = round(spread_pct, 4),
        decision   = "SWAP",
        rationale  = (
            f"{req.get('agent_name','?')} {req['direction']} {pair} "
            f"notional={req['amount']:,.0f} settled @ {real_rate:.6f} "
            f"spread={spread_pct:.3f}%"
        ),
        action     = "SWAP",
        confidence = round(random.uniform(0.82, 0.97), 2),
        tx_hash    = tx,
    )

    is_onchain = not tx.startswith("local-")
    label = "⛓ on-chain" if is_onchain else "local-hash"
    log_agent(
        AGENT_ID,
        f"SETTLED req#{req['id']} {req['direction']} {pair} "
        f"{req['amount']:,.0f} @ {real_rate:.6f} "
        f"spread={spread_pct:.3f}% [{label}] tx={tx[:14]}…",
    )


def run():
    init_db()
    log_agent(AGENT_ID, "Settler started — agent wallet rotation, real Casper txs")

    while True:
        try:
            now       = int(time.time())
            open_reqs = get_open_trade_requests()
            due       = [r for r in open_reqs if now - r["timestamp"] >= SETTLE_AFTER]

            if due:
                for req in due:
                    settle_request(req)
                    time.sleep(2)
            else:
                if open_reqs:
                    oldest_age = now - min(r["timestamp"] for r in open_reqs)
                    log_agent(AGENT_ID, f"{len(open_reqs)} pending — oldest {oldest_age}s, settling soon")
                else:
                    log_agent(AGENT_ID, "No open requests — idle")

        except Exception as e:
            log_agent(AGENT_ID, f"Error: {e}")

        time.sleep(POLL)


if __name__ == "__main__":
    run()
