"""Core aggregator: merges rates, queries CSPR.trade pool, calls Groq for decisions, executes swaps."""
import sys
import time
import json
import random

sys.path.insert(0, "/root/alphx")

import requests
from backend.config import GROQ_API_KEY, CSPR_TRADE_MCP_URL
from backend.db import (
    init_db, get_all_rates, mark_stale_rates,
    log_agent, log_decision,
)

POLL_INTERVAL = 60  # 1 minute
SPREAD_THRESHOLD = 0.5  # percent
MAX_LLM_CALLS_PER_CYCLE = 10  # top N opportunities evaluated by Groq per cycle
GROQ_CALL_INTERVAL = 2.5  # seconds between Groq calls (free tier: ~30 rpm)
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def call_groq(pair: str, real_rate: float, pool_rate: float, spread_pct: float, bid: float, ask: float) -> dict:
    if not GROQ_API_KEY:
        return {"action": "HOLD", "rationale": "No Groq API key configured", "confidence": 0.0}

    prompt = f"""You are an autonomous FX settlement agent on Casper Network (ALPHX).

Current market data:
- Pair: {pair}
- Real-world FX rate: {real_rate:.6f}
- CSPR.trade pool rate: {pool_rate:.6f}
- Spread: {spread_pct:.3f}%
- Bid: {bid:.6f}, Ask: {ask:.6f}

Should this agent execute a cross-border settlement swap now?
Consider: spread size, market conditions, settlement efficiency.

Respond in JSON only:
{{
  "action": "SWAP" or "HOLD",
  "rationale": "one sentence explanation",
  "confidence": 0.0-1.0
}}"""

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 150,
        "response_format": {"type": "json_object"},
    }

    try:
        resp = requests.post(GROQ_API_URL, headers=headers, json=body, timeout=15)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception as e:
        log_agent("aggregator", f"Groq error for {pair}: {e}")
        return {"action": "HOLD", "rationale": f"LLM error: {e}", "confidence": 0.0}


def get_pool_rate(pair: str) -> float | None:
    """Query CSPR.trade MCP server for pool rate. Returns None if unavailable."""
    if not CSPR_TRADE_MCP_URL:
        return None
    try:
        resp = requests.get(
            f"{CSPR_TRADE_MCP_URL}/pool/rate",
            params={"pair": pair},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            return float(data.get("rate", 0)) or None
        return None
    except Exception:
        return None


def execute_swap(pair: str, pool_rate: float) -> str:
    """Execute swap via CSPR.trade MCP. Returns tx_hash or empty string."""
    if not CSPR_TRADE_MCP_URL:
        return ""
    try:
        resp = requests.post(
            f"{CSPR_TRADE_MCP_URL}/swap",
            json={"pair": pair, "rate": pool_rate},
            timeout=30,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("tx_hash", "")
        return ""
    except Exception as e:
        log_agent("aggregator", f"Swap execution error for {pair}: {e}")
        return ""


def simulate_pool_rate(real_rate: float) -> float:
    """Simulate pool rate when MCP not available: add random spread 0.1-2.0%."""
    spread_factor = 1 + random.uniform(-0.02, 0.02)
    return real_rate * spread_factor


def run():
    init_db()
    log_agent("aggregator", "Aggregator agent started (Groq brain: llama-3.3-70b-versatile)")

    while True:
        try:
            mark_stale_rates(900)
            rates = get_all_rates()

            if not rates:
                log_agent("aggregator", "No rates in DB yet, waiting for data agents")
                time.sleep(POLL_INTERVAL)
                continue

            active = [r for r in rates if not r["stale"] and r["rate"] and r["rate"] > 0]
            log_agent("aggregator", f"Scanning {len(active)} active pairs ({len(rates)} total)")

            # First pass: compute spreads for all pairs without calling Groq
            candidates = []
            for rate_row in active:
                pair = rate_row["pair"]
                real_rate = rate_row["rate"]
                bid = rate_row["bid"] or real_rate * 0.9999
                ask = rate_row["ask"] or real_rate * 1.0001

                pool_rate = get_pool_rate(pair)
                if pool_rate is None:
                    pool_rate = simulate_pool_rate(real_rate)

                if pool_rate <= 0:
                    continue

                spread_pct = abs(real_rate - pool_rate) / real_rate * 100
                if spread_pct >= SPREAD_THRESHOLD:
                    candidates.append((spread_pct, pair, real_rate, pool_rate, bid, ask))

            # Sort by spread descending, take top N for Groq evaluation
            candidates.sort(key=lambda x: x[0], reverse=True)
            top = candidates[:MAX_LLM_CALLS_PER_CYCLE]
            log_agent("aggregator", f"{len(candidates)} pairs above {SPREAD_THRESHOLD}% spread — evaluating top {len(top)} with Groq")

            swap_count = 0
            decision_count = 0

            for spread_pct, pair, real_rate, pool_rate, bid, ask in top:
                decision_count += 1
                result = call_groq(pair, real_rate, pool_rate, spread_pct, bid, ask)

                action = result.get("action", "HOLD")
                rationale = result.get("rationale", "")
                confidence = float(result.get("confidence", 0.0))

                tx_hash = ""
                if action == "SWAP" and confidence > 0.7:
                    tx_hash = execute_swap(pair, pool_rate)
                    if tx_hash:
                        swap_count += 1
                        log_agent(
                            "aggregator",
                            f"SWAP executed {pair} @ {pool_rate:.6f} spread={spread_pct:.2f}% tx={tx_hash}"
                        )
                    else:
                        log_agent(
                            "aggregator",
                            f"SWAP decided {pair} @ {pool_rate:.6f} spread={spread_pct:.2f}% conf={confidence:.2f} (MCP unavailable)"
                        )
                else:
                    log_agent(
                        "aggregator",
                        f"HOLD {pair} spread={spread_pct:.2f}% conf={confidence:.2f}: {rationale}"
                    )

                log_decision(
                    pair, real_rate, pool_rate, spread_pct,
                    action, rationale, action, confidence, tx_hash
                )

                time.sleep(GROQ_CALL_INTERVAL)

            log_agent(
                "aggregator",
                f"Cycle done: {decision_count} decisions, {swap_count} swaps"
            )

        except Exception as e:
            log_agent("aggregator", f"Outer error: {e}")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run()
