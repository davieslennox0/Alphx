# ALPHXC — Autonomous Cross-Border FX Settlement on Casper

ALPHXC is a multi-agent autonomous FX settlement platform. Eight background agents monitor 100+ real forex pairs, post cross-border trade requests, and settle them on Casper Network — with Groq LLM as the decision brain, live CSPR.trade pool data via MCP, and a Casper Wallet-connected UI for user-submitted trades.

**46,000+ settled trades · 19B+ USD total volume · 3,400+ Casper testnet transactions**

**Live:** `https://alphxc.duckdns.org`  
**Buildathon tracks:** Agentic AI · DeFi & Payments · RWA Tokenization

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          ALPHXC SYSTEM                               │
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐                                │
│  │ yahoo_agent  │   │twelvedata_ag │  Rate collectors                │
│  │ (5 min poll) │   │ (15 min poll)│  yfinance + REST                │
│  └──────┬───────┘   └──────┬───────┘                                │
│         └──────────┬────────┘                                        │
│                    ▼                                                  │
│           ┌──────────────┐                                           │
│           │  SQLite DB   │  rates · agent_log · decisions            │
│           │  alphx.db    │  trade_requests · payments                │
│           └──────┬───────┘                                           │
│                  │                                                    │
│     ┌────────────┼──────────────────────────┐                       │
│     ▼            ▼                          ▼                        │
│  ┌──────────┐ ┌─────────────────┐  ┌──────────────────────┐        │
│  │aggregator│ │ trader_a/b/c    │  │   settler_agent      │        │
│  │  agent   │ │ 3 trade agents  │  │                      │        │
│  │          │ │                 │  │ Routes open requests │        │
│  │ Groq LLM │ │ AfroPay Corp    │  │ to pool @ market rate│        │
│  │ SWAP/HOLD│ │ SilkRoad Exports│  │ logs SWAP + tx_hash  │        │
│  │ decisions│ │ Treasury AI     │  │ every 35s            │        │
│  └────┬─────┘ └─────────────────┘  └──────────────────────┘        │
│       │                                                               │
│       │  ┌──────────────────────────┐                               │
│       └─►│  CSPR.trade MCP (hosted) │  Live DEX pool data          │
│          │  JSON-RPC over HTTP      │  WCSPR/sCSPR spread anchor    │
│          │  mcp.cspr.trade/mcp      │  23 tools: pairs, quotes...   │
│          └──────────────────────────┘                               │
│                                                                      │
│           ┌──────────────────────────┐                              │
│           │   FastAPI (port 8400)    │                              │
│           │   /fx/*  rate endpoints  │                              │
│           │   /agent/* polling feeds │                              │
│           │   /trade/request  (POST) │◄── Casper Wallet users       │
│           │   x402 payment gate      │                              │
│           └──────────────────────────┘                              │
│                        │                                             │
│           ┌────────────▼─────────────┐                              │
│           │   React/Vite Dashboard   │                              │
│           │   alphxc.duckdns.org     │                              │
│           │   Wallet Connect UI      │                              │
│           └──────────────────────────┘                              │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Agents (8 total)

| PM2 name | Agent | Role |
|---|---|---|
| `alphxc-yahoo` | Yahoo Finance | Fetches 100+ FX pairs every 5 min via yfinance |
| `alphxc-twelvedata` | Twelve Data | Supplements rates via REST API every 15 min |
| `alphxc-aggregator` | Aggregator / Groq | Merges rates, fetches CSPR.trade pool spread via MCP, calls Groq for SWAP/HOLD decisions every 60s |
| `alphxc-trader-a` | AfroPay Corp | Posts BUY EUR/USD, SELL USD/NGN (Africa↔Europe corridor) |
| `alphxc-trader-b` | SilkRoad Exports | Posts SELL GBP/USD, BUY USD/JPY (Asia↔UK exports) |
| `alphxc-trader-c` | Treasury AI | Posts USD/TRY, EUR/GBP hedge requests (corporate treasury) |
| `alphxc-settler` | Settler | Settles every open trade request against pool within ~35s, posts Casper tx hash on-chain |
| `alphxc-cspr-trade-mcp` | CSPR.trade MCP (local) | Local fallback MCP server — idle when hosted URL is active |

---

## CSPR.trade MCP Integration

The aggregator connects to the [CSPR.trade](https://cspr.trade) DEX via its hosted MCP server (`https://mcp.cspr.trade/mcp`) using the standard JSON-RPC over HTTP protocol:

```
POST /mcp  →  { method: "initialize" }  →  receive mcp-session-id header
POST /mcp  →  { method: "tools/call", params: { name: "get_pairs" } }  →  SSE response
```

The **WCSPR/sCSPR pool** on Casper testnet is used as the on-chain spread anchor: the ratio of pool reserves (currently ~6.28% deviation from parity) scales the simulated FX spread in the aggregator, grounding the simulation in real Casper DEX liquidity.

```
CSPR.trade MCP: WCSPR/sCSPR=0.937212 pool spread=6.28% (FX anchor)
```

---

## Track Alignment

| Track | How ALPHXC qualifies |
|---|---|
| **Agentic AI** | 8 autonomous agents run continuously; Groq LLM (`llama-3.1-8b-instant`) makes structured SWAP/HOLD decisions on live FX spreads; CSPR.trade MCP gives agents live DEX market intelligence |
| **DeFi & Payments** | x402 micropayment gating on API; settler agent executes swaps and logs Casper tx hashes; Casper Wallet connect for user-submitted trades; CSPR.trade pool spread anchors settlement pricing |
| **RWA Tokenization** | Real-world FX rates bridged on-chain; FXOracle deployed on Casper testnet as a named URef (`fx_oracle` key); Casper testnet is the permanent audit trail |

---

## On-Chain Oracle

The FXOracle is deployed on **Casper testnet** as a WAT-compiled WASM session contract.

**Deploy tx:** `ea5ce800d913afc45098d7a2b799a7e59240f6d68ce91e65e3f1b402a0f311d7`  
**Oracle URef:** `uref-0febf998853cbc1498bb7e94d44eac062b2b33795c9482f4e98ec7f8aae762a4-007`  
**Named key:** `fx_oracle` under account `a9f2b27ef191cc910819317720efc7d23c98472611d2e802d095396633a059f9`

The URef is the oracle's on-chain handle — settler agents can write current FX rates to it and other contracts can read via the `fx_oracle` named key lookup.

### Casper 2.x WAT compilation notes

The Odra/Rust-compiled contract emits `bulk-memory` WASM instructions that Casper 2.x (Condor) rejects. We hand-wrote a minimal WAT contract (`contract/minimal/FXOracle_v4.wat`) with key ABI discoveries for Casper 2.2.2:

| Finding | Detail |
|---|---|
| `CLType::Unit` tag | **9** — not 15 (ByteArray); wrong tag causes "early end of stream" |
| `casper_new_uref` output | Writes **33 bytes**: `[32-byte addr][1-byte access_rights]` — not 32 |
| `casper_put_key` name | Must be a **Casper serialized String**: `[4-byte LE length][utf8_bytes]` |
| `casper_put_key` key | **Raw Key bytes** `[tag(1)][addr(32)][rights(1)]` = 34 bytes for URef — no extra length prefix |
| Bulk-memory | **Not supported** in Casper 2.x VM — Odra/ink! contracts fail at instantiation |

Deploy script: `backend/casper_helper/deploy_oracle.cjs` (uses `casper-js-sdk` `SessionBuilder`).

---

## Live Dashboard

`https://alphxc.duckdns.org`

| Panel | What it shows |
|---|---|
| **Metric Cards** (top) | Total Value Settled · 24h Trading Volume (count + USD) · Avg Settlement ~8s · Active AI Agents |
| **FX Rates** (left) | 20 major pairs by default (toggle to all 100+) · rate, bid, ask, spread, source, freshness |
| **Agent Activity** (top right) | Latest 10 log lines from all agents, colour-coded |
| **Trade Requests** (middle right) | Last 10 trade requests — OPEN → SETTLED with Casper explorer tx link |
| **Swap Executions** (bottom right) | Last 10 settled swaps with confidence, spread %, and `↗ cspr.live` link |
| **Wallet Connect** (header) | Connect Casper Wallet extension → submit your own BUY/SELL → agent settles within ~35s |

Metric cards sync from `/health` every 15 seconds. All volume figures come from real settled `trade_requests` rows in SQLite.

---

## Wallet Connect Flow

1. Click **Connect Wallet** in the header (requires [Casper Wallet](https://www.casper.network/en-US/casper-wallet) browser extension)
2. Approve connection → your public key appears in the header
3. Click **+ New Trade** → select pair, direction, amount
4. Submit → your request appears in Trade Requests panel tagged `YOU`
5. Settler agent picks it up and settles within ~35 seconds, posting a Casper tx hash

No CLI required — the wallet extension handles all signing client-side.

---

## Quickstart

### 1. Clone & configure

```bash
git clone https://github.com/davieslennox0/Alphx
cd Alphx
cp .env.example .env
# Fill in GROQ_API_KEY, TWELVE_DATA_API_KEY, CSPR_CLOUD_API_KEY
```

### 2. Install Python deps

```bash
pip install -r requirements.txt
```

### 3. Start all agents with PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 logs
```

### 4. Build & serve frontend

```bash
cd frontend
cp .env.example .env   # set VITE_ORACLE_CONTRACT_HASH
npm install && npm run build
# Caddy serves frontend/dist at alphxc.duckdns.org
```

### 5. Deploy the oracle contract (optional)

The oracle is already deployed. To redeploy:

```bash
node backend/casper_helper/deploy_oracle.cjs
# Uses wallet/agents/trader_a_secret_key.pem by default
# Outputs the new URef → update ORACLE_CONTRACT_HASH in .env
```

---

## API Endpoints

### Public (no payment)

```bash
GET  /health                        # system status, volumes, counts
GET  /fx/pairs                      # list all tracked pairs
GET  /fx/rates/snapshot             # all rates with bid/ask/spread/source
GET  /agent/feed/recent             # last 10 agent log entries
GET  /agent/feed/since?after=<id>   # incremental agent log
GET  /agent/trades/recent           # last 50 trade requests
GET  /agent/swaps/recent            # last 50 swap executions
POST /trade/request                 # submit a user trade (wallet connect)
```

### x402-gated (paid, requires CSPR transfer)

```bash
# Single rate — 0.001 CSPR
curl -H "X-PAYMENT-SIGNATURE: <deploy_hash>" \
  https://alphxc.duckdns.org/fx/rate/EUR/USD

# Batch — 0.001 CSPR
curl -H "X-PAYMENT-SIGNATURE: <deploy_hash>" \
  "https://alphxc.duckdns.org/fx/rates/batch?pairs=EUR/USD,GBP/USD"

# Full snapshot — 0.01 CSPR
curl -H "X-PAYMENT-SIGNATURE: <deploy_hash>" \
  https://alphxc.duckdns.org/fx/rates/all
```

**x402 flow:** send CSPR to `ORACLE_WALLET_PUBLIC_KEY` → pass deploy hash in `X-PAYMENT-SIGNATURE` header → ALPHXC verifies on-chain via CSPR.cloud.

---

## Environment Variables

| Variable | Description |
|---|---|
| `TWELVE_DATA_API_KEY` | Twelve Data REST API key (free tier: 800 credits/day) |
| `GROQ_API_KEY` | Groq API key (free, get at console.groq.com) |
| `CSPR_CLOUD_API_KEY` | CSPR.cloud API key for x402 payment verification |
| `ORACLE_WALLET_SECRET_KEY` | Casper testnet wallet secret key (never commit) |
| `ORACLE_WALLET_PUBLIC_KEY` | Casper testnet wallet public key (x402 recipient) |
| `ORACLE_CONTRACT_HASH` | Deployed FXOracle URef (set after deploy) |
| `CSPR_TRADE_MCP_URL` | CSPR.trade MCP server URL (`https://mcp.cspr.trade/mcp`) |
| `CASPER_NODE_URL` | Casper RPC endpoint (default: node.testnet.casper.network/rpc) |
| `DB_PATH` | SQLite database path (default: /root/alphx/alphx.db) |
| `PORT` | API port (default: 8400) |

### Frontend

| Variable | Description |
|---|---|
| `VITE_ORACLE_CONTRACT_HASH` | Oracle URef shown in the Casper Testnet tooltip |
