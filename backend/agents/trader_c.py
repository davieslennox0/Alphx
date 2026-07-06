"""Treasury AI — corporate FX hedging agent.
Posts SELL USD/TRY and BUY EUR/GBP requests for treasury risk management.
"""
import sys
import time
import random

sys.path.insert(0, "/root/alphx")

from backend.db import init_db, log_agent, post_trade_request, get_open_trade_requests

AGENT_ID = "trader_c"
AGENT_NAME = "Treasury AI"
POLL_INTERVAL = 50

TRADE_PROFILES = [
    ("USD/TRY", "SELL", (50_000, 500_000)),   # Reduce TRY exposure, sell USD
    ("EUR/GBP", "BUY",  (20_000, 180_000)),   # EU-UK cross-border treasury hedge
    ("GBP/USD", "BUY",  (30_000, 250_000)),   # GBP corporate account funding
    ("USD/ZAR", "SELL", (25_000, 200_000)),   # South Africa operations funding
    ("EUR/USD", "BUY",  (40_000, 400_000)),   # EUR payroll for EU subsidiaries
]


def pending_count() -> int:
    return sum(1 for r in get_open_trade_requests() if r["agent"] == AGENT_ID)


def run():
    init_db()
    log_agent(AGENT_ID, f"{AGENT_NAME} treasury agent started — corporate FX risk management")

    while True:
        try:
            if pending_count() < 5:
                pair, direction, (lo, hi) = random.choice(TRADE_PROFILES)
                amount = round(random.uniform(lo, hi), 2)

                req_id = post_trade_request(AGENT_ID, AGENT_NAME, pair, direction, amount)
                log_agent(
                    AGENT_ID,
                    f"{direction} {pair} notional={amount:,.0f} req_id={req_id} | treasury rebalance",
                )
            else:
                log_agent(AGENT_ID, f"Treasury balanced — {pending_count()} hedges open")

        except Exception as e:
            log_agent(AGENT_ID, f"Error: {e}")

        jitter = random.uniform(0.9, 1.15)
        time.sleep(POLL_INTERVAL * jitter)


if __name__ == "__main__":
    run()
