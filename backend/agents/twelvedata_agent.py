"""Pulls FX rates from Twelve Data REST API every 15 minutes."""
import sys
import time
import math

sys.path.insert(0, "/root/alphx")

import requests
from backend.config import TWELVE_DATA_API_KEY
from backend.db import init_db, upsert_rate, log_agent

POLL_INTERVAL = 900  # 15 minutes
BATCH_SIZE = 120
BASE_URL = "https://api.twelvedata.com"

_pair_list: list[str] = []
_last_pair_fetch = 0


def fetch_pair_list() -> list[str]:
    global _pair_list, _last_pair_fetch
    if _pair_list and time.time() - _last_pair_fetch < 3600:
        return _pair_list
    try:
        resp = requests.get(
            f"{BASE_URL}/forex_pairs",
            params={"apikey": TWELVE_DATA_API_KEY},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        pairs = [item["symbol"] for item in data.get("data", []) if "symbol" in item]
        _pair_list = pairs
        _last_pair_fetch = time.time()
        log_agent("twelvedata", f"Fetched {len(pairs)} forex pairs from Twelve Data")
        return pairs
    except Exception as e:
        log_agent("twelvedata", f"Failed to fetch pair list: {e}")
        return _pair_list


def fetch_batch_rates(pairs: list[str]) -> dict:
    """Fetch prices for a batch of pairs. Returns {pair: float}."""
    if not pairs or not TWELVE_DATA_API_KEY:
        return {}
    symbols = ",".join(pairs)
    try:
        resp = requests.get(
            f"{BASE_URL}/price",
            params={"symbol": symbols, "apikey": TWELVE_DATA_API_KEY},
            timeout=20,
        )
        if resp.status_code == 429:
            log_agent("twelvedata", "Daily credit limit reached — skipping until tomorrow")
            return {}
        resp.raise_for_status()
        data = resp.json()
        result = {}
        if len(pairs) == 1:
            if "price" in data:
                result[pairs[0]] = float(data["price"])
        else:
            for sym, val in data.items():
                if isinstance(val, dict) and "price" in val:
                    try:
                        result[sym] = float(val["price"])
                    except (ValueError, TypeError):
                        pass
        return result
    except Exception as e:
        log_agent("twelvedata", f"Batch fetch error: {e}")
        return {}


def run():
    init_db()
    log_agent("twelvedata", "Twelve Data agent started")

    if not TWELVE_DATA_API_KEY:
        log_agent("twelvedata", "No TWELVE_DATA_API_KEY set — agent idle")
        while True:
            time.sleep(3600)

    while True:
        try:
            pairs = fetch_pair_list()
            if not pairs:
                log_agent("twelvedata", "No pairs to fetch, sleeping")
                time.sleep(POLL_INTERVAL)
                continue

            num_batches = math.ceil(len(pairs) / BATCH_SIZE)
            total_updated = 0

            for i in range(num_batches):
                batch = pairs[i * BATCH_SIZE : (i + 1) * BATCH_SIZE]
                rates = fetch_batch_rates(batch)

                for pair in batch:
                    if pair in rates:
                        price = rates[pair]
                        bid = price * 0.9999
                        ask = price * 1.0001
                        upsert_rate(pair, price, bid, ask, "twelvedata")
                        total_updated += 1

                log_agent("twelvedata", f"Batch {i+1}/{num_batches}: {len(rates)} rates updated")
                time.sleep(2)

            log_agent("twelvedata", f"Cycle complete: {total_updated} pairs updated")

        except Exception as e:
            log_agent("twelvedata", f"Outer error: {e}")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run()
