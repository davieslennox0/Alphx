import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import RateTable         from '../components/RateTable'
import AgentFeed         from '../components/AgentFeed'
import SwapFeed          from '../components/SwapFeed'
import TradeRequestFeed  from '../components/TradeRequestFeed'
import WalletConnect     from '../components/WalletConnect'
import SandboxWallet     from '../components/SandboxWallet'
import TradeForm         from '../components/TradeForm'
import MetricCards       from '../components/MetricCards'
import SwiftComparison   from '../components/SwiftComparison'
import NetworkTooltip    from '../components/NetworkTooltip'
import CircuitBreaker    from '../components/CircuitBreaker'
import AgentRegistry     from '../components/AgentRegistry'
import ArchitecturePortal from '../components/ArchitecturePortal'

const API_BASE = import.meta.env.VITE_API_URL || ''

function StatChip({ label, value, highlight }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 h-6 bg-surface-2 border border-zinc-800 rounded whitespace-nowrap shrink-0">
      <span className="text-zinc-500 text-xs">{label}:</span>
      <span className={`text-xs font-medium ${highlight ? 'text-cyan-400' : 'text-zinc-200'}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function genHex(len) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

const MOCK_PAIRS = ['USD/NGN', 'EUR/NGN', 'GBP/KES', 'USD/GHS', 'EUR/ZAR', 'USD/ZAR']

export default function Dashboard() {
  const navigate = useNavigate()

  const [health,         setHealth]       = useState(null)
  const [extraStats,     setExtraStats]   = useState({})
  const [walletKey,      setWalletKey]    = useState(null)
  const [sandboxWallet,  setSandbox]      = useState(null)
  const [showTrade,      setShowTrade]    = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [showRegistry,   setShowRegistry] = useState(false)
  const [showArchitecture,setShowArch]    = useState(false)

  // Section 4b — Trigger Agent Swap simulation
  const [simTrade,   setSimTrade]   = useState(null)
  const [simSwap,    setSimSwap]    = useState(null)
  const [simBusy,    setSimBusy]    = useState(false)

  const activeKey   = walletKey || sandboxWallet?.address
  const walletLabel = sandboxWallet && !walletKey ? sandboxWallet.name : 'Casper Wallet'

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const r = await fetch(`${API_BASE}/health`)
        if (r.ok) setHealth(await r.json())
      } catch {}
    }
    fetchHealth()
    const id = setInterval(fetchHealth, 15000)
    return () => clearInterval(id)
  }, [])

  const triggerSwap = useCallback(() => {
    if (simBusy) return
    const pair   = MOCK_PAIRS[Math.floor(Math.random() * MOCK_PAIRS.length)]
    const amount = Math.floor(5000 + Math.random() * 45000)
    const reqId  = Math.floor(Math.random() * 99999)
    const now    = Math.floor(Date.now() / 1000)
    const simId  = `sim-${Date.now()}`

    setSimBusy(true)
    setSimTrade({ id: simId, status: 'OPEN', pair, amount, reqId, timestamp: now, tx_hash: null, agent: 'user', direction: 'BUY' })

    setTimeout(() => {
      setSimTrade(prev => prev ? { ...prev, status: 'PROCESSING' } : prev)
    }, 3000)

    setTimeout(() => {
      const txHash = genHex(64)
      setSimTrade(prev => prev ? { ...prev, status: 'SETTLED', tx_hash: txHash } : prev)
      setSimSwap({
        id:             `sim-swap-${Date.now()}`,
        pair,
        spread_pct:     parseFloat((0.5 + Math.random() * 1.5).toFixed(3)),
        confidence:     parseFloat((0.85 + Math.random() * 0.15).toFixed(3)),
        groq_rationale: `Spread detected in ${pair} corridor, executing settlement via Casper testnet`,
        timestamp:      Math.floor(Date.now() / 1000),
        tx_hash:        txHash,
        isNew:          true,
      })
      setSimBusy(false)
    }, 8000)
  }, [simBusy])

  const contractHash = import.meta.env.VITE_ORACLE_CONTRACT_HASH || ''

  return (
    <div className="h-screen bg-surface-0 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="shrink-0 border-b border-zinc-800 bg-surface-1 px-4 h-11 flex items-center">
        <div className="max-w-screen-2xl w-full mx-auto flex items-center gap-2">

          {/* Brand */}
          <button
            onClick={() => navigate('/')}
            className="text-sm font-bold text-zinc-100 tracking-tight whitespace-nowrap hover:text-cyan-300 transition-colors"
          >
            ALPHXC
          </button>
          <span className="text-xs text-zinc-600 whitespace-nowrap hidden xl:block">Autonomous FX Settlement</span>

          {/* Casper badge with tooltip */}
          <NetworkTooltip contractHash={contractHash} />

          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
          <span className="w-px h-4 bg-zinc-800 shrink-0" />

          {/* Stats row */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <StatChip label="Pairs"     value={health?.pair_count ?? extraStats?.pair_count ?? '…'} />
            <StatChip label="Settled"   value={health?.total_settled != null ? health.total_settled.toLocaleString() : '…'} highlight />
            <StatChip label="On-chain"  value={health?.total_onchain_tx != null ? `${health.total_onchain_tx.toLocaleString()} ⛓` : '…'} highlight={health?.total_onchain_tx > 0} />
            <StatChip label="Decisions" value={health?.total_decisions != null ? health.total_decisions.toLocaleString() : '…'} />
            <StatChip label="Updated"   value={health?.last_update ? new Date(health.last_update * 1000).toLocaleTimeString() : '—'} />
            <StatChip label="LLM"       value="Groq llama-3.1-8b" />
          </div>

          {/* Right controls */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <CircuitBreaker healthy={true} />
            <span className="w-px h-4 bg-zinc-800" />
            <button
              onClick={() => setShowRegistry(true)}
              className="hidden sm:flex items-center gap-1 h-6 px-2 text-xs rounded border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition-colors whitespace-nowrap"
            >
              Agents
            </button>
            <button
              onClick={() => setShowArch(true)}
              className="hidden sm:flex items-center gap-1 h-6 px-2 text-xs rounded border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition-colors whitespace-nowrap"
            >
              Architecture
            </button>
            <span className="w-px h-4 bg-zinc-800" />
            <SandboxWallet
              wallet={sandboxWallet}
              onConnected={setSandbox}
              onDisconnect={() => setSandbox(null)}
            />
            {!sandboxWallet && (
              <WalletConnect
                onConnected={setWalletKey}
                onTrade={() => setShowTrade(true)}
              />
            )}
            {sandboxWallet && (
              <button
                onClick={() => setShowTrade(true)}
                className="flex items-center h-6 px-2.5 text-xs rounded bg-cyan-900 border border-cyan-700 text-cyan-300 hover:bg-cyan-800 transition-colors font-medium whitespace-nowrap"
              >
                + New Trade
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Metric Cards ── */}
      <div className="shrink-0 px-4 py-2 border-b border-zinc-800 bg-surface-0">
        <div className="max-w-screen-2xl mx-auto">
          <MetricCards health={health} />
        </div>
      </div>

      {/* ── Action bar: Trigger + Comparison toggle ── */}
      <div className="shrink-0 px-4 py-1.5 border-b border-zinc-800 bg-surface-0">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-3">
          <button
            onClick={triggerSwap}
            disabled={simBusy}
            className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors border ${
              simBusy
                ? 'bg-zinc-900 border-zinc-700 text-zinc-600 cursor-not-allowed'
                : 'bg-green-900 border-green-700 text-green-300 hover:bg-green-800'
            }`}
          >
            {simBusy ? '⏳ Settlement in progress...' : '⚡ Trigger Agent Swap'}
          </button>

          <SwiftComparison visible={showComparison} onToggle={() => setShowComparison(v => !v)} />
        </div>
      </div>

      {/* ── Swift Comparison (expanded) ── */}
      {showComparison && (
        <div className="shrink-0 px-4 pb-2 border-b border-zinc-800 bg-surface-0">
          <div className="max-w-screen-2xl mx-auto">
            <SwiftComparison visible={true} onToggle={() => setShowComparison(false)} />
          </div>
        </div>
      )}

      {/* ── Trade form modal ── */}
      {showTrade && activeKey && (
        <TradeForm
          publicKey={activeKey}
          walletLabel={walletLabel}
          onClose={() => setShowTrade(false)}
          onSubmitted={() => {}}
        />
      )}

      {/* ── Drawers / Modals ── */}
      {showRegistry    && <AgentRegistry     onClose={() => setShowRegistry(false)} />}
      {showArchitecture && <ArchitecturePortal onClose={() => setShowArch(false)} />}

      {/* ── Main content ── */}
      <main className="flex-1 min-h-0 max-w-screen-2xl w-full mx-auto p-3 flex gap-3">
        {/* Left — Rate table */}
        <div className="flex-1 min-w-0 bg-surface-1 border border-zinc-800 rounded-lg p-3 flex flex-col overflow-hidden">
          <RateTable onStats={setExtraStats} />
        </div>

        {/* Right — 3 stacked panels */}
        <div className="w-[36%] shrink-0 flex flex-col gap-2 min-h-0">
          <div className="shrink-0 h-36 bg-surface-1 border border-zinc-800 rounded-lg p-2.5 flex flex-col overflow-hidden">
            <AgentFeed />
          </div>
          <div className="flex-1 min-h-0 bg-surface-1 border border-zinc-800 rounded-lg p-2.5 flex flex-col overflow-hidden">
            <TradeRequestFeed extraTrade={simTrade} />
          </div>
          <div className="flex-1 min-h-0 bg-surface-1 border border-zinc-800 rounded-lg p-2.5 flex flex-col overflow-hidden">
            <SwapFeed extraSwap={simSwap} />
          </div>
        </div>
      </main>
    </div>
  )
}
