"""ALPHX FastAPI backend — FX rates, agent feeds, x402-gated endpoints."""
import asyncio
import json
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from backend.db import (
    init_db, get_all_rates, get_rate,
    get_recent_logs, get_recent_decisions, get_swaps,
    count_decisions_today, count_swaps_today,
    mark_stale_rates,
)
from backend.x402 import payment_required
from backend.config import PORT


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="ALPHX", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    mark_stale_rates(900)
    rates = get_all_rates()
    last_update = max((r["timestamp"] for r in rates if r["timestamp"]), default=0)
    return {
        "status": "ok",
        "pair_count": len(rates),
        "last_update": last_update,
        "decisions_today": count_decisions_today(),
        "swaps_executed": count_swaps_today(),
    }


@app.get("/fx/pairs")
async def fx_pairs():
    rates = get_all_rates()
    return {"pairs": [r["pair"] for r in rates], "count": len(rates)}


@app.get("/fx/rate/{base}/{quote}")
@payment_required(amount_cspr=0.001)
async def fx_rate(request: Request, base: str, quote: str):
    pair = f"{base.upper()}/{quote.upper()}"
    row = get_rate(pair)
    if not row:
        return JSONResponse(status_code=404, content={"error": f"Pair {pair} not found"})
    return row


@app.get("/fx/rates/batch")
@payment_required(amount_cspr=0.001)
async def fx_rates_batch(request: Request, pairs: str = Query(..., description="Comma-separated pairs e.g. EUR/USD,GBP/USD")):
    pair_list = [p.strip().upper() for p in pairs.split(",")]
    result = []
    for pair in pair_list:
        row = get_rate(pair)
        if row:
            result.append(row)
    return {"rates": result, "count": len(result)}


@app.get("/fx/rates/all")
@payment_required(amount_cspr=0.01)
async def fx_rates_all(request: Request):
    mark_stale_rates(900)
    rates = get_all_rates()
    return {"rates": rates, "count": len(rates), "timestamp": int(time.time())}


@app.get("/agent/feed")
async def agent_feed():
    async def event_generator():
        last_id = 0
        import sqlite3
        from backend.config import DB_PATH

        while True:
            try:
                conn = sqlite3.connect(DB_PATH)
                conn.row_factory = sqlite3.Row
                rows = conn.execute(
                    "SELECT * FROM agent_log WHERE id > ? ORDER BY id ASC LIMIT 50",
                    (last_id,),
                ).fetchall()
                conn.close()

                for row in rows:
                    last_id = row["id"]
                    data = json.dumps(dict(row))
                    yield f"data: {data}\n\n"

                if not rows:
                    yield ": heartbeat\n\n"

            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

            await asyncio.sleep(2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/agent/decisions")
async def agent_decisions():
    async def event_generator():
        last_id = 0
        import sqlite3
        from backend.config import DB_PATH

        while True:
            try:
                conn = sqlite3.connect(DB_PATH)
                conn.row_factory = sqlite3.Row
                rows = conn.execute(
                    "SELECT * FROM decisions WHERE id > ? ORDER BY id ASC LIMIT 20",
                    (last_id,),
                ).fetchall()
                conn.close()

                for row in rows:
                    last_id = row["id"]
                    data = json.dumps(dict(row))
                    yield f"data: {data}\n\n"

                if not rows:
                    yield ": heartbeat\n\n"

            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

            await asyncio.sleep(3)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/agent/swaps")
async def agent_swaps():
    async def event_generator():
        last_id = 0
        import sqlite3
        from backend.config import DB_PATH

        while True:
            try:
                conn = sqlite3.connect(DB_PATH)
                conn.row_factory = sqlite3.Row
                rows = conn.execute(
                    "SELECT * FROM decisions WHERE action='SWAP' AND id > ? ORDER BY id ASC LIMIT 10",
                    (last_id,),
                ).fetchall()
                conn.close()

                for row in rows:
                    last_id = row["id"]
                    data = json.dumps(dict(row))
                    yield f"data: {data}\n\n"

                if not rows:
                    yield ": heartbeat\n\n"

            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

            await asyncio.sleep(3)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/agent/decisions/recent")
async def decisions_recent():
    return {"decisions": get_recent_decisions(50)}


@app.get("/agent/swaps/recent")
async def swaps_recent():
    return {"swaps": get_swaps(50)}
