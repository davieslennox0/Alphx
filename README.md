# ALPHX — Autonomous Cross-Border FX Settlement on Casper

ALPHX is a B2B autonomous FX settlement agent that monitors 400+ real forex pairs, identifies profitable settlement windows against on-chain pool rates, and executes swaps on Casper Network — with Groq LLM as the decision brain.

**Buildathon tracks:** Agentic AI · DeFi & Payments · RWA Tokenization

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ALPHX SYSTEM                             │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │  yahoo_agent.py │    │twelvedata_agent │                    │
│  │  (5min poll)    │    │  (15min poll)   │                    │
│  │  yfinance       │    │  REST API       │                    │
│  └────────┬────────┘    └────────┬────────┘                    │
│           └──────────┬───────────┘                             │
│                      ▼                                          │
│              ┌──────────────┐                                   │
│              │  SQLite DB   │  rates / agent_log                │
│              │  alphx.db    │  decisions / payments             │
│              └──────┬───────┘                                   │
│                     │                                           │
│              ┌──────▼───────────────────┐                      │
│              │   aggregator_agent.py    │                      │
│              │                          │                      │
│              │  1. Merge & normalize    │                      │
│              │  2. Query CSPR.trade MCP │◄── CSPR.trade pools  │
│              │  3. Groq decision        │◄── llama-3.3-70b     │
│              │  4. Execute swap         │──► Casper Testnet    │
│              └──────────────────────────┘                      │
│                                                                 │
│              ┌──────────────────────────┐                      │
│              │   FastAPI (port 8400)    │                      │
│              │   x402 payment gate      │◄── CSPR.cloud verify │
│              │   SSE agent feeds        │                      │
│              └──────────────────────────┘                      │
│                           │                                     │
│              ┌────────────▼─────────────┐                      │
│              │   React/Vite Dashboard   │                      │
│              │   (Caddy → alphx.xyz)    │                      │
│              └──────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Track Alignment

| Track | How ALPHX qualifies |
|---|---|
| **Agentic AI** | Three autonomous agents run continuously; Groq LLM makes structured SWAP/HOLD decisions |
| **DeFi & Payments** | x402 micropayment gating on API; autonomous swap execution via CSPR.trade |
| **RWA Tokenization** | Real-world FX rates bridged to on-chain; Casper blockchain is the permanent audit trail |

---

## Quickstart

### 1. Clone & configure

```bash
git clone https://github.com/yourhandle/alphx
cd alphx
cp .env.example .env
# Fill in your keys in .env
```

### 2. Install Python deps

```bash
pip install -r requirements.txt
```

### 3. Deploy the Odra contract (Casper Testnet)

```bash
cd contract
cargo install cargo-odra
cargo odra build -b casper
cargo odra deploy -b casper --network testnet
# Copy the contract hash to ORACLE_CONTRACT_HASH in .env
cd ..
```

### 4. Start with pm2

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 logs
```

### 5. Build & serve frontend

```bash
cd frontend
npm install
npm run build
cd ..
# Caddy will serve frontend/dist
caddy run --config Caddyfile
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `TWELVE_DATA_API_KEY` | Twelve Data REST API key (free tier: 800 credits/day) |
| `GROQ_API_KEY` | Groq API key (free, get at console.groq.com) |
| `CSPR_CLOUD_API_KEY` | CSPR.cloud API key for Casper RPC |
| `ORACLE_WALLET_SECRET_KEY` | Casper testnet wallet secret key |
| `ORACLE_WALLET_PUBLIC_KEY` | Casper testnet wallet public key (x402 recipient) |
| `ORACLE_CONTRACT_HASH` | Deployed FXOracle contract hash |
| `CSPR_TRADE_MCP_URL` | CSPR.trade MCP server URL |
| `CASPER_NODE_URL` | Casper RPC endpoint |

---

## API Endpoints

### Free endpoints
```bash
GET /health
GET /fx/pairs
GET /agent/feed      # SSE
GET /agent/decisions # SSE
GET /agent/swaps     # SSE
```

### x402-gated (paid) endpoints
```bash
# Single rate — costs 0.001 CSPR
curl -H "X-PAYMENT-SIGNATURE: <deploy_hash>" \
  https://alphx.xyz/fx/rate/EUR/USD

# Batch rates — costs 0.001 CSPR
curl -H "X-PAYMENT-SIGNATURE: <deploy_hash>" \
  "https://alphx.xyz/fx/rates/batch?pairs=EUR/USD,GBP/USD"

# All rates snapshot — costs 0.01 CSPR
curl -H "X-PAYMENT-SIGNATURE: <deploy_hash>" \
  https://alphx.xyz/fx/rates/all
```

**x402 payment flow:**
1. Send CSPR transfer to `ORACLE_WALLET_PUBLIC_KEY` on Casper Testnet
2. Note the deploy hash
3. Pass it in `X-PAYMENT-SIGNATURE` header
4. ALPHX verifies on-chain via CSPR.cloud

---

## How the Groq Decision Loop Works

Every 60 seconds the aggregator:
1. Reads all non-stale rates from SQLite
2. Queries CSPR.trade pool for each pair's on-chain price
3. Computes spread: `|real_rate - pool_rate| / real_rate * 100`
4. For any spread > 0.5%, calls Groq (`llama-3.3-70b-versatile`) with:
   - Pair, real rate, pool rate, spread, bid, ask
   - Asks: SWAP or HOLD? Confidence 0-1?
5. If `action=SWAP` and `confidence > 0.7` → executes swap via CSPR.trade MCP
6. All decisions + tx hashes logged to SQLite and streamed to dashboard

---

## How CSPR.trade MCP Execution Works

ALPHX calls the CSPR.trade MCP server (set `CSPR_TRADE_MCP_URL` in .env):

```
POST /swap  { pair, rate }  → { tx_hash }
GET  /pool/rate?pair=X      → { rate }
```

The resulting deploy hash is stored in the `decisions` table and linked to the Casper testnet explorer from the dashboard.

---

## Live Dashboard

`https://alphx.xyz`

- Left panel: 400+ searchable FX pairs with live rate, spread, source, and freshness indicator
- Right top: real-time agent activity stream
- Right bottom: swap execution feed with Casper explorer links
