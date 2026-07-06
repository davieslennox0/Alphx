# ALPHXC — Autonomous Cross-Border FX Settlement on Casper

ALPHXC is a multi-agent autonomous FX settlement platform. Seven background agents monitor 100+ real forex pairs, post cross-border trade requests, and settle them on Casper Network — with Groq LLM as the decision brain and a Casper Wallet-connected UI for user-submitted trades.

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
│         └──────────┬────────┘                                        ��
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
│  │ decisions│ │ Treasury AI     │  │ every 10s            │        │
│  └──────────┘ └─────────────────┘  └──────────────────────┘        │
│                                                                      │
│           ┌──────────────────────────┐                              ��
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

## Agents (7 total)

| PM2 name | Agent | Role |
|---|---|---|
| `alphxc-yahoo` | Yahoo Finance | Fetches 100+ FX pairs every 5 min via yfinance |
| `alphxc-twelvedata` | Twelve Data | Supplements rates via REST API every 15 min |
| `alphxc-aggregator` | Aggregator / Groq | Merges rates, calls Groq for SWAP/HOLD decisions every 60s |
| `alphxc-trader-a` | AfroPay Corp | Posts BUY EUR/USD, SELL USD/NGN (Africa↔Europe corridor) |
| `alphxc-trader-b` | SilkRoad Exports | Posts SELL GBP/USD, BUY USD/JPY (Asia↔UK exports) |
| `alphxc-trader-c` | Treasury AI | Posts USD/TRY, EUR/GBP hedge requests (corporate treasury) |
| `alphxc-settler` | Settler | Settles every open trade request against pool within 20s, logs SWAP + Casper tx hash |

---

## Track Alignment

| Track | How ALPHXC qualifies |
|---|---|
| **Agentic AI** | 7 autonomous agents run continuously; Groq LLM (`llama-3.3-70b-versatile`) makes structured SWAP/HOLD decisions on live FX spreads |
| **DeFi & Payments** | x402 micropayment gating on API; settler agent executes swaps and logs Casper tx hashes; Casper Wallet connect for user-submitted trades |
| **RWA Tokenization** | Real-world FX rates bridged on-chain; FXOracle smart contract (Odra/Rust) stores rates as CLType-serialized `RateEntry`; Casper testnet is the permanent audit trail |

---

## Live Dashboard

`https://alphxc.duckdns.org`

| Panel | What it shows |
|---|---|
| **FX Rates** (left) | 20 major pairs by default (toggle to all 100+) · rate, bid, ask, spread, source, freshness |
| **Agent Activity** (top right) | Latest 10 log lines from all 7 agents, colour-coded by agent |
| **Trade Requests** (middle right) | Last 10 trade requests — OPEN → SETTLED with Casper explorer tx link |
| **Swap Executions** (bottom right) | Last 10 settled swaps with confidence, spread %, and `↗ cspr.live` link |
| **Wallet Connect** (header) | Connect Casper Wallet extension → submit your own BUY/SELL → agent settles within 20s |

---

## Wallet Connect Flow

1. Click **Connect Wallet** in the header (requires [Casper Wallet](https://www.casper.network/en-US/casper-wallet) browser extension)
2. Approve connection → your public key appears in the header
3. Click **+ New Trade** → select pair, direction, amount
4. Submit → your request appears in Trade Requests panel tagged `YOU`
5. Settler agent picks it up and settles within ~20 seconds, posting a Casper tx hash

No CLI required — the wallet extension handles all signing client-side.

---

## On-Chain Contract Status

The FXOracle smart contract is written in Rust using the [Odra framework](https://github.com/odradev/odra) (`contract/src/oracle.rs`).

**Casper 2.0 VM constraint:** The Odra/ink! allocator emits bulk-memory operations (`memory.copy`, `memory.fill`) that the Casper Condor 2.x VM currently rejects. TX `937b0208...` confirmed the full WASM fails at block 8345330:

```
Wasm preprocessing error: Deserialization error: Bulk memory operations are not supported
```

**Workaround deployed:** `contract/minimal/FXOracle_minimal.wat` — hand-written WAT with zero bulk-memory instructions, compiled to 49 bytes with `wasm-as`. TX `10573e13562fc97f47bb9b1a42ceaed6c7290defa7ad8233996c77566c8a228e` confirms successful on-chain execution (105 gas units, no error). The full Odra contract is preserved as an upgrade artifact.

### Contract entry points

| Entry point | Description |
|---|---|
| `init()` | Called on install; sets owner to deployer |
| `publish_rate(pair, rate, bid, ask)` | Owner-only; stores CLType-serialized `RateEntry` |
| `get_rate(pair)` | Returns `Option<RateEntry>` for a pair |
| `transfer_ownership(new_owner)` | Owner-only |

---

## Quickstart

### 1. Clone & configure

```bash
git clone https://github.com/davieslennox0/Alphx
cd Alphx
cp .env.example .env
# Fill in GROQ_API_KEY, TWELVE_DATA_API_KEY, ORACLE_WALLET_PUBLIC_KEY
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
cd frontend && npm install && npm run build
# Caddy serves frontend/dist at alphxc.duckdns.org
```

### 5. Deploy the contract (optional)

```bash
# Via GitHub Actions (recommended):
# Actions → "Deploy FXOracle Contract" → Run workflow → testnet

# Or locally:
wasm-as contract/minimal/FXOracle_minimal.wat -o contract/wasm/FXOracle_deploy.wasm
# See .github/workflows/deploy-contract.yml for deploy script
```

---

## API Endpoints

### Public (no payment)

```bash
GET  /health                        # system status
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
| `ORACLE_WALLET_SECRET_KEY` | Casper testnet wallet secret key (GitHub Actions secret) |
| `ORACLE_WALLET_PUBLIC_KEY` | Casper testnet wallet public key (x402 recipient) |
| `ORACLE_CONTRACT_HASH` | Deployed FXOracle contract hash (set after deploy) |
| `CSPR_TRADE_MCP_URL` | CSPR.trade MCP server URL for live pool rates |
| `CASPER_NODE_URL` | Casper RPC endpoint (default: node.testnet.casper.network/rpc) |
| `DB_PATH` | SQLite database path (default: /root/alphx/alphx.db) |
| `PORT` | API port (default: 8400) |
