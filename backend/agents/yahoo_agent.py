"""Pulls FX rates from Yahoo Finance every 5 minutes and writes to SQLite."""
import sys
import os
import time

sys.path.insert(0, "/root/alphx")

import yfinance as yf
from backend.db import init_db, upsert_rate, log_agent

POLL_INTERVAL = 300  # 5 minutes

MAJORS = ["EUR", "GBP", "AUD", "NZD", "CAD", "CHF", "JPY"]
BASE_USD_PAIRS = [
    ("EUR", "USD"), ("GBP", "USD"), ("AUD", "USD"), ("NZD", "USD"),
    ("USD", "JPY"), ("USD", "CHF"), ("USD", "CAD"),
]

CROSSES = [
    (b, q) for b in MAJORS for q in MAJORS if b != q
    if (b, q) not in [("USD", x) for x in MAJORS]
    and (b, q) not in [(x, "USD") for x in MAJORS]
]

AFRICAN = [
    ("USD", "NGN"), ("USD", "GHS"), ("USD", "KES"), ("USD", "ZAR"),
    ("USD", "EGP"), ("USD", "MAD"), ("USD", "TND"), ("USD", "UGX"),
    ("USD", "TZS"), ("USD", "RWF"), ("USD", "ETB"), ("USD", "XOF"),
    ("USD", "XAF"), ("USD", "MZN"), ("USD", "ZMW"),
]

ASIAN = [
    ("USD", "PKR"), ("USD", "BDT"), ("USD", "INR"), ("USD", "IDR"),
    ("USD", "PHP"), ("USD", "VND"), ("USD", "MYR"), ("USD", "THB"),
    ("USD", "SGD"), ("USD", "HKD"), ("USD", "CNY"), ("USD", "KRW"),
    ("USD", "TWD"), ("USD", "LKR"), ("USD", "NPR"), ("USD", "MMK"),
    ("USD", "KHR"), ("USD", "LAK"),
]

LATAM = [
    ("USD", "MXN"), ("USD", "BRL"), ("USD", "ARS"), ("USD", "CLP"),
    ("USD", "COP"), ("USD", "PEN"), ("USD", "UYU"), ("USD", "BOB"),
    ("USD", "PYG"), ("USD", "GTQ"), ("USD", "HNL"),
]

MIDDLE_EAST = [
    ("USD", "AED"), ("USD", "SAR"), ("USD", "QAR"), ("USD", "KWD"),
    ("USD", "BHD"), ("USD", "OMR"), ("USD", "JOD"), ("USD", "ILS"),
    ("USD", "TRY"), ("USD", "IRR"),
]

EUROPE_OTHERS = [
    ("USD", "NOK"), ("USD", "SEK"), ("USD", "DKK"), ("USD", "PLN"),
    ("USD", "HUF"), ("USD", "CZK"), ("USD", "RON"), ("USD", "BGN"),
    ("USD", "HRK"), ("USD", "RUB"), ("USD", "UAH"),
]

ALL_PAIRS = (
    BASE_USD_PAIRS + CROSSES + AFRICAN + ASIAN + LATAM + MIDDLE_EAST + EUROPE_OTHERS
)


def pair_to_ticker(base: str, quote: str) -> str:
    return f"{base}{quote}=X"


def normalize_pair(base: str, quote: str) -> str:
    return f"{base}/{quote}"


def fetch_batch(tickers: list[str]) -> dict:
    if not tickers:
        return {}
    try:
        data = yf.download(
            tickers,
            period="1d",
            interval="1m",
            progress=False,
            auto_adjust=True,
            group_by="ticker",
        )
        return data
    except Exception as e:
        log_agent("yahoo", f"Batch download error: {e}")
        return {}


def run():
    init_db()
    log_agent("yahoo", "Yahoo Finance agent started")

    while True:
        try:
            pair_map = {pair_to_ticker(b, q): (b, q) for b, q in ALL_PAIRS}
            tickers = list(pair_map.keys())

            chunk_size = 50
            updated = 0

            for i in range(0, len(tickers), chunk_size):
                chunk = tickers[i : i + chunk_size]
                try:
                    if len(chunk) == 1:
                        ticker = yf.Ticker(chunk[0])
                        info = ticker.fast_info
                        base, quote = pair_map[chunk[0]]
                        pair = normalize_pair(base, quote)
                        last = getattr(info, "last_price", None)
                        if last and last > 0:
                            bid = getattr(info, "bid", last * 0.9999)
                            ask = getattr(info, "ask", last * 1.0001)
                            bid = bid if bid and bid > 0 else last * 0.9999
                            ask = ask if ask and ask > 0 else last * 1.0001
                            upsert_rate(pair, last, bid, ask, "yahoo")
                            updated += 1
                    else:
                        raw = yf.download(
                            chunk,
                            period="1d",
                            interval="5m",
                            progress=False,
                            auto_adjust=True,
                            group_by="ticker",
                        )
                        for ticker in chunk:
                            base, quote = pair_map[ticker]
                            pair = normalize_pair(base, quote)
                            try:
                                if len(chunk) == 1:
                                    close_series = raw["Close"]
                                else:
                                    close_series = raw[ticker]["Close"]
                                last = float(close_series.dropna().iloc[-1])
                                if last > 0:
                                    bid = last * 0.9999
                                    ask = last * 1.0001
                                    upsert_rate(pair, last, bid, ask, "yahoo")
                                    updated += 1
                            except Exception:
                                pass
                except Exception as e:
                    log_agent("yahoo", f"Chunk error [{i}:{i+chunk_size}]: {e}")

                time.sleep(1)

            log_agent("yahoo", f"Updated {updated}/{len(tickers)} pairs")

        except Exception as e:
            log_agent("yahoo", f"Outer error: {e}")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run()
