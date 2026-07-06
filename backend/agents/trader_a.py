"""AfroPay Corp — cross-border remittance agent (Africa ↔ Europe).
Posts BUY EUR/USD and SELL USD/NGN trade requests to the ALPHXC settlement network.
"""
import sys
import time
import random

sys.path.insert(0, "/root/alphx")

from backend.db import init_db, log_agent, post_trade_request, get_open_trade_requests

AGENT_ID = "trader_a"
AGENT_NAME = "AfroPay Corp"
POLL_INTERVAL = 45  # seconds between new trade requests

# Pairs and typical notional sizes (base currency units)
TRADE_PROFILES = [
    ("EUR/USD", "BUY",  (20_000, 150_000)),   # EUR needed for EU imports
    ("USD/NGN", "SELL", (10_000, 80_000)),     # USD proceeds → NGN for local ops
    ("GBP/USD", "BUY",  (15_000, 100_000)),   # GBP for UK supplier settlement
]


def pending_count() -> int:
    return sum(1 for r in get_open_trade_requests() if r["agent"] == AGENT_ID)


def run():
    init_db()
    log_agent(AGENT_ID, f"{AGENT_NAME} trade agent started — cross-border Africa/Europe corridor")

    while True:
        try:
            if pending_count() < 5:
                pair, direction, (lo, hi) = random.choice(TRADE_PROFILES)
                amount = round(random.uniform(lo, hi), 2)
                rate_limit = None  # market order

                req_id = post_trade_request(AGENT_ID, AGENT_NAME, pair, direction, amount, rate_limit)
                log_agent(
                    AGENT_ID,
                    f"{direction} {pair} notional={amount:,.0f} req_id={req_id} | {AGENT_NAME} needs settlement",
                )
            else:
                log_agent(AGENT_ID, f"Holding — {pending_count()} requests awaiting settlement")

        except Exception as e:
            log_agent(AGENT_ID, f"Error: {e}")

        jitter = random.uniform(0.85, 1.2)
        time.sleep(POLL_INTERVAL * jitter)


if __name__ == "__main__":
    run()
