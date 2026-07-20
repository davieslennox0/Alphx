import sqlite3
import time
from backend.config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS rates (
    pair TEXT PRIMARY KEY,
    rate REAL,
    bid REAL,
    ask REAL,
    spread REAL,
    source TEXT,
    timestamp INTEGER,
    stale INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS agent_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT,
    message TEXT,
    timestamp INTEGER
);

CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pair TEXT,
    real_rate REAL,
    pool_rate REAL,
    spread_pct REAL,
    groq_decision TEXT,
    groq_rationale TEXT,
    action TEXT,
    confidence REAL,
    tx_hash TEXT,
    timestamp INTEGER
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pair TEXT,
    amount_cspr REAL,
    tx_hash TEXT,
    timestamp INTEGER
);

CREATE TABLE IF NOT EXISTS trade_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT,
    agent_name TEXT,
    pair TEXT,
    direction TEXT,
    amount REAL,
    rate_limit REAL,
    status TEXT DEFAULT 'OPEN',
    match_id INTEGER,
    tx_hash TEXT DEFAULT '',
    settled_rate REAL,
    timestamp INTEGER,
    settled_at INTEGER
);
"""


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)


def upsert_rate(pair: str, rate: float, bid: float, ask: float, source: str):
    spread = round(ask - bid, 6) if bid and ask else 0.0
    ts = int(time.time())
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO rates (pair, rate, bid, ask, spread, source, timestamp, stale)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0)
               ON CONFLICT(pair) DO UPDATE SET
                 rate=excluded.rate, bid=excluded.bid, ask=excluded.ask,
                 spread=excluded.spread, source=excluded.source,
                 timestamp=excluded.timestamp, stale=0""",
            (pair, rate, bid, ask, spread, source, ts),
        )


def log_agent(agent: str, message: str):
    ts = int(time.time())
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO agent_log (agent, message, timestamp) VALUES (?, ?, ?)",
            (agent, message, ts),
        )


def log_decision(
    pair: str,
    real_rate: float,
    pool_rate: float,
    spread_pct: float,
    decision: str,
    rationale: str,
    action: str,
    confidence: float,
    tx_hash: str = "",
):
    ts = int(time.time())
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO decisions
               (pair, real_rate, pool_rate, spread_pct, groq_decision, groq_rationale,
                action, confidence, tx_hash, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (pair, real_rate, pool_rate, spread_pct, decision, rationale, action, confidence, tx_hash, ts),
        )


def mark_stale_rates(max_age_seconds: int = 900):
    cutoff = int(time.time()) - max_age_seconds
    with get_conn() as conn:
        conn.execute("UPDATE rates SET stale=1 WHERE timestamp < ?", (cutoff,))


def get_all_rates() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM rates ORDER BY pair").fetchall()
        return [dict(r) for r in rows]


def get_rate(pair: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM rates WHERE pair=?", (pair,)).fetchone()
        return dict(row) if row else None


def get_recent_logs(limit: int = 100) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM agent_log ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in reversed(rows)]


def get_recent_decisions(limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM decisions ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in reversed(rows)]


def get_swaps(limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM decisions WHERE action='SWAP' ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in reversed(rows)]


def count_decisions_today() -> int:
    start = int(time.time()) - 86400
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as c FROM decisions WHERE timestamp > ?", (start,)
        ).fetchone()
        return row["c"]


def count_swaps_today() -> int:
    start = int(time.time()) - 86400
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as c FROM decisions WHERE action='SWAP' AND timestamp > ?", (start,)
        ).fetchone()
        return row["c"]


def count_total_settled() -> int:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as c FROM trade_requests WHERE status='SETTLED'"
        ).fetchone()
        return row["c"]


def count_onchain_tx() -> int:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as c FROM trade_requests "
            "WHERE status='SETTLED' AND tx_hash != '' AND tx_hash IS NOT NULL "
            "AND tx_hash NOT LIKE 'local-%'"
        ).fetchone()
        return row["c"]


def count_total_decisions() -> int:
    with get_conn() as conn:
        row = conn.execute("SELECT COUNT(*) as c FROM decisions").fetchone()
        return row["c"]


def volume_24h() -> float:
    since = int(time.time()) - 86400
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) as v FROM trade_requests "
            "WHERE status='SETTLED' AND settled_at > ?", (since,)
        ).fetchone()
        return float(row["v"])


def volume_total() -> float:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) as v FROM trade_requests "
            "WHERE status='SETTLED'"
        ).fetchone()
        return float(row["v"])


def post_trade_request(
    agent: str, agent_name: str, pair: str, direction: str,
    amount: float, rate_limit: float | None = None
) -> int:
    ts = int(time.time())
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO trade_requests
               (agent, agent_name, pair, direction, amount, rate_limit, status, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)""",
            (agent, agent_name, pair, direction, amount, rate_limit, ts),
        )
        return cur.lastrowid


def get_open_trade_requests() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM trade_requests WHERE status='OPEN' ORDER BY timestamp ASC"
        ).fetchall()
        return [dict(r) for r in rows]


def settle_trade_pair(buy_id: int, sell_id: int, settled_rate: float, tx_hash: str):
    now = int(time.time())
    with get_conn() as conn:
        conn.execute(
            """UPDATE trade_requests SET status='SETTLED', match_id=?, tx_hash=?,
               settled_rate=?, settled_at=? WHERE id=?""",
            (sell_id, tx_hash, settled_rate, now, buy_id),
        )
        conn.execute(
            """UPDATE trade_requests SET status='SETTLED', match_id=?, tx_hash=?,
               settled_rate=?, settled_at=? WHERE id=?""",
            (buy_id, tx_hash, settled_rate, now, sell_id),
        )


def get_recent_trade_requests(limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM trade_requests ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in reversed(rows)]
