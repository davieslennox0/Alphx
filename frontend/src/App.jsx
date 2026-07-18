import { useState, useEffect } from 'react'
import RateTable from './components/RateTable'
import AgentFeed from './components/AgentFeed'
import SwapFeed from './components/SwapFeed'
import TradeRequestFeed from './components/TradeRequestFeed'
import WalletConnect from './components/WalletConnect'
import TradeForm from './components/TradeForm'

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

export default function App() {
  const [health, setHealth]         = useState(null)
  const [extraStats, setExtraStats] = useState({})
  const [walletKey, setWalletKey]   = useState(null)
  const [showTrade, setShowTrade]   = useState(false)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const resp = await fetch(`${API_BASE}/health`)
        if (resp.ok) setHealth(await resp.json())
      } catch {}
    }
    fetchHealth()
    const id = setInterval(fetchHealth, 15000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="h-screen bg-surface-0 flex flex-col overflow-hidden">
      {/* Header — single aligned row */}
      <header className="shrink-0 border-b border-zinc-800 bg-surface-1 px-4 h-11 flex items-center">
        <div className="max-w-screen-2xl w-full mx-auto flex items-center gap-3">

          {/* Brand */}
          <span className="text-sm font-bold text-zinc-100 tracking-tight whitespace-nowrap">ALPHXC</span>
          <span className="text-xs text-zinc-600 whitespace-nowrap hidden lg:block">Autonomous FX Settlement</span>
          <a
            href="https://testnet.cspr.live"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 px-2 h-5 rounded-full border border-red-800 bg-red-950/40 text-red-400 text-xs font-medium whitespace-nowrap hover:border-red-600 transition-colors shrink-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Casper Testnet
          </a>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />

          {/* Separator */}
          <span className="w-px h-4 bg-zinc-800 shrink-0" />

          {/* Stats — all same height via items-center on parent */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <StatChip label="Pairs"     value={health?.pair_count ?? extraStats?.pair_count ?? '…'} />
            <StatChip label="Settled"   value={health?.total_settled != null ? health.total_settled.toLocaleString() : '…'} highlight />
            <StatChip label="On-chain"  value={health?.total_onchain_tx != null ? `${health.total_onchain_tx.toLocaleString()} ⛓` : '…'} highlight={health?.total_onchain_tx > 0} />
            <StatChip label="Decisions" value={health?.total_decisions != null ? health.total_decisions.toLocaleString() : '…'} />
            <StatChip label="Updated"   value={health?.last_update ? new Date(health.last_update * 1000).toLocaleTimeString() : '—'} />
            <StatChip label="LLM"       value="Groq llama-3.1-8b" />
          </div>

          {/* Wallet — pinned right */}
          <div className="ml-auto shrink-0">
            <WalletConnect
              onConnected={setWalletKey}
              onTrade={() => setShowTrade(true)}
            />
          </div>

        </div>
      </header>

      {/* Trade form modal */}
      {showTrade && walletKey && (
        <TradeForm
          publicKey={walletKey}
          onClose={() => setShowTrade(false)}
          onSubmitted={() => {}}
        />
      )}

      {/* Main content — fills remaining viewport */}
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
            <TradeRequestFeed />
          </div>
          <div className="flex-1 min-h-0 bg-surface-1 border border-zinc-800 rounded-lg p-2.5 flex flex-col overflow-hidden">
            <SwapFeed />
          </div>
        </div>
      </main>
    </div>
  )
}
