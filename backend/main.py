"""ALPHXC FastAPI backend — FX rates, agent feeds, x402-gated endpoints."""
import asyncio
import json
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from backend.db import (
    init_db, get_all_rates, get_rate,
    get_recent_logs, get_recent_decisions, get_swaps,
    count_decisions_today, count_swaps_today,
    count_total_settled, count_onchain_tx, count_total_decisions,
    volume_24h, volume_total,
    mark_stale_rates, get_recent_trade_requests, post_trade_request,
)
from backend.x402 import payment_required
from backend.config import PORT


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="ALPHXC", version="1.0.0", lifespan=lifespan)

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
        "total_settled": count_total_settled(),
        "total_onchain_tx": count_onchain_tx(),
        "total_decisions": count_total_decisions(),
        "volume_24h": volume_24h(),
        "volume_total": volume_total(),
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


@app.get("/fx/rates/snapshot")
async def fx_rates_snapshot():
    """Free public snapshot for dashboard display."""
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


@app.get("/agent/feed/recent")
async def agent_feed_recent():
    return {"logs": get_recent_logs(10)}


@app.get("/agent/feed/since")
async def agent_feed_since(after: int = Query(0)):
    import sqlite3
    from backend.config import DB_PATH
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM agent_log WHERE id > ? ORDER BY id ASC LIMIT 20", (after,)
    ).fetchall()
    conn.close()
    return {"logs": [dict(r) for r in rows]}


@app.get("/agent/decisions/recent")
async def decisions_recent():
    return {"decisions": get_recent_decisions(50)}


@app.get("/agent/swaps/recent")
async def swaps_recent():
    return {"swaps": get_swaps(50)}


@app.get("/agent/trades")
async def agent_trades():
    async def event_generator():
        last_id = 0
        import sqlite3
        from backend.config import DB_PATH

        while True:
            try:
                conn = sqlite3.connect(DB_PATH)
                conn.row_factory = sqlite3.Row
                rows = conn.execute(
                    "SELECT * FROM trade_requests WHERE id > ? ORDER BY id ASC LIMIT 20",
                    (last_id,),
                ).fetchall()
                conn.close()

                for row in rows:
                    last_id = row["id"]
                    yield f"data: {json.dumps(dict(row))}\n\n"

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


@app.get("/agent/trades/recent")
async def trades_recent():
    return {"trades": get_recent_trade_requests(50)}


@app.get("/agent/volume")
async def agent_volume():
    """Real settled notional volume — all-time and last 24h."""
    import sqlite3
    from backend.config import DB_PATH
    since = int(time.time()) - 86400
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    r1 = conn.execute(
        "SELECT SUM(amount) as vol, COUNT(*) as cnt FROM trade_requests WHERE status='SETTLED'"
    ).fetchone()
    r2 = conn.execute(
        "SELECT SUM(amount) as vol, COUNT(*) as cnt FROM trade_requests "
        "WHERE status='SETTLED' AND settled_at > ?", (since,)
    ).fetchone()
    conn.close()
    return {
        "total_notional":  float(r1["vol"] or 0),
        "total_count":     int(r1["cnt"] or 0),
        "volume_24h":      float(r2["vol"] or 0),
        "count_24h":       int(r2["cnt"] or 0),
    }


@app.get("/agent/stats")
async def agent_stats():
    """Per-agent trade counts for today and all-time."""
    import sqlite3
    from backend.config import DB_PATH
    since = int(time.time()) - 86400
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT agent, COUNT(*) as today, SUM(1) as total FROM trade_requests "
        "WHERE agent IN ('trader_a','trader_b','trader_c') "
        "GROUP BY agent",
    ).fetchall()
    today_rows = conn.execute(
        "SELECT agent, COUNT(*) as c FROM trade_requests "
        "WHERE agent IN ('trader_a','trader_b','trader_c') AND timestamp > ? "
        "GROUP BY agent",
        (since,),
    ).fetchall()
    conn.close()
    today_map = {r["agent"]: r["c"] for r in today_rows}
    return {
        "agents": [
            {"agent": r["agent"], "today": today_map.get(r["agent"], 0), "total": r["total"]}
            for r in rows
        ]
    }


class UserTradeRequest(BaseModel):
    public_key: str
    pair: str
    direction: str        # BUY | SELL
    amount: float


@app.post("/trade/request")
async def user_trade_request(body: UserTradeRequest):
    pk = body.public_key.strip()
    direction = body.direction.upper()
    pair = body.pair.upper()

    if direction not in ("BUY", "SELL"):
        return JSONResponse(status_code=400, content={"error": "direction must be BUY or SELL"})
    if body.amount <= 0:
        return JSONResponse(status_code=400, content={"error": "amount must be positive"})
    if "/" not in pair:
        return JSONResponse(status_code=400, content={"error": "invalid pair format"})

    short_key = f"{pk[:8]}…{pk[-4:]}" if len(pk) > 12 else pk
    req_id = post_trade_request(
        agent="user",
        agent_name=short_key,
        pair=pair,
        direction=direction,
        amount=round(body.amount, 2),
    )
    return {"req_id": req_id, "status": "OPEN", "pair": pair, "direction": direction, "amount": body.amount}
