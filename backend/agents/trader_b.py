"""SilkRoad Exports — Asia-to-UK/EU trade settlement agent.
Posts SELL GBP/USD and BUY USD/JPY trade requests for export invoice settlements.
"""
import sys
import time
import random

sys.path.insert(0, "/root/alphx")

from backend.db import init_db, log_agent, post_trade_request, get_open_trade_requests

AGENT_ID = "trader_b"
AGENT_NAME = "SilkRoad Exports"
POLL_INTERVAL = 55

TRADE_PROFILES = [
    ("GBP/USD", "SELL", (25_000, 200_000)),   # UK buyer pays USD, exporter converts to GBP
    ("USD/JPY", "BUY",  (500_000, 5_000_000)), # JPY supplier invoice — buy JPY with USD
    ("EUR/USD", "SELL", (30_000, 250_000)),    # EU proceeds converted to USD for reinvestment
    ("AUD/USD", "BUY",  (40_000, 300_000)),   # Australian commodity purchase
]


def pending_count() -> int:
    return sum(1 for r in get_open_trade_requests() if r["agent"] == AGENT_ID)


def run():
    init_db()
    log_agent(AGENT_ID, f"{AGENT_NAME} trade agent started — Asia/UK export corridor")

    while True:
        try:
            if pending_count() < 5:
                pair, direction, (lo, hi) = random.choice(TRADE_PROFILES)
                amount = round(random.uniform(lo, hi), 2)

                req_id = post_trade_request(AGENT_ID, AGENT_NAME, pair, direction, amount)
                log_agent(
                    AGENT_ID,
                    f"{direction} {pair} notional={amount:,.0f} req_id={req_id} | export invoice pending",
                )
            else:
                log_agent(AGENT_ID, f"Queue full ({pending_count()} open) — awaiting settler")

        except Exception as e:
            log_agent(AGENT_ID, f"Error: {e}")

        jitter = random.uniform(0.8, 1.3)
        time.sleep(POLL_INTERVAL * jitter)


if __name__ == "__main__":
    run()
