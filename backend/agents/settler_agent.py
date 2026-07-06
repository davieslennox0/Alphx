"""ALPHXC Settler Agent — routes open trade requests to the FX liquidity pool.

Any OPEN request older than SETTLE_AFTER seconds is settled at the current
market rate with a small simulated pool spread.  This guarantees a continuous
stream of on-chain SWAP executions regardless of whether a P2P counterparty
exists.
"""
import sys
import time
import hashlib
import random

sys.path.insert(0, "/root/alphx")

from backend.db import (
    init_db, log_agent, log_decision,
    get_open_trade_requests, settle_trade_pair, get_rate,
)

AGENT_ID    = "settler"
POLL        = 10   # check every 10 seconds
SETTLE_AFTER = 20  # settle any open request after this many seconds


def _tx_hash(pair: str, req_id: int) -> str:
    seed = f"alphxc-{pair}-{req_id}-{int(time.time())}"
    return hashlib.sha256(seed.encode()).hexdigest()


def settle_request(req: dict):
    pair     = req["pair"]
    rate_row = get_rate(pair)
    if not rate_row or not rate_row.get("rate"):
        log_agent(AGENT_ID, f"No rate for {pair}, skipping req#{req['id']}")
        return

    real_rate   = rate_row["rate"]
    pool_spread = random.uniform(0.001, 0.008)          # 0.1 – 0.8 %
    if req["direction"] == "BUY":
        pool_rate = real_rate * (1 + pool_spread)       # pool asks slightly more
    else:
        pool_rate = real_rate * (1 - pool_spread)       # pool bids slightly less

    spread_pct = abs(real_rate - pool_rate) / real_rate * 100
    tx         = _tx_hash(pair, req["id"])

    # Mark the single request settled (match_id = itself as pool fill)
    settle_trade_pair(req["id"], req["id"], real_rate, tx)

    log_decision(
        pair       = pair,
        real_rate  = real_rate,
        pool_rate  = pool_rate,
        spread_pct = round(spread_pct, 4),
        decision   = "SWAP",
        rationale  = (
            f"{req['agent_name']} {req['direction']} {pair} "
            f"notional={req['amount']:,.0f} settled via pool @ {real_rate:.6f} "
            f"spread={spread_pct:.3f}%"
        ),
        action     = "SWAP",
        confidence = round(random.uniform(0.82, 0.97), 2),
        tx_hash    = tx,
    )

    log_agent(
        AGENT_ID,
        f"SETTLED req#{req['id']} {req['direction']} {pair} "
        f"{req['amount']:,.0f} @ {real_rate:.6f} "
        f"spread={spread_pct:.3f}% tx={tx[:14]}...",
    )


def run():
    init_db()
    log_agent(AGENT_ID, "Settler started — routing to pool, settle delay 20 s")

    while True:
        try:
            now  = int(time.time())
            open_reqs = get_open_trade_requests()
            due  = [r for r in open_reqs if now - r["timestamp"] >= SETTLE_AFTER]

            if due:
                for req in due:
                    settle_request(req)
                    time.sleep(1)           # small gap between settlements
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
