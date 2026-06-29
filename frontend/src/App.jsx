import { useState, useEffect } from 'react'
import RateTable from './components/RateTable'
import AgentFeed from './components/AgentFeed'
import SwapFeed from './components/SwapFeed'

const API_BASE = import.meta.env.VITE_API_URL || ''

function StatChip({ label, value, highlight }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-surface-2 border border-zinc-800 rounded">
      <span className="text-zinc-500 text-xs">{label}:</span>
      <span className={`text-xs font-medium ${highlight ? 'text-cyan-400' : 'text-zinc-200'}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

export default function App() {
  const [health, setHealth] = useState(null)
  const [extraStats, setExtraStats] = useState({})

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
    <div className="min-h-screen bg-surface-0 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-surface-1 px-6 py-3">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
                ALPHX
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Autonomous Cross-Border FX Settlement on Casper Network
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400">Casper Testnet</span>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatChip
              label="Total Pairs"
              value={health?.pair_count ?? extraStats?.pair_count ?? '...'}
            />
            <StatChip
              label="Decisions Today"
              value={health?.decisions_today ?? 0}
            />
            <StatChip
              label="Swaps Executed"
              value={health?.swaps_executed ?? 0}
              highlight={health?.swaps_executed > 0}
            />
            <StatChip
              label="Last Update"
              value={health?.last_update
                ? new Date(health.last_update * 1000).toLocaleTimeString()
                : '—'}
            />
            <StatChip label="LLM" value="Groq llama-3.3-70b" />
            <StatChip label="Network" value="casper-test" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-screen-2xl w-full mx-auto p-4 flex gap-4 overflow-hidden" style={{ height: 'calc(100vh - 96px)' }}>
        {/* Left 60% — Rate table */}
        <div className="flex-1 min-w-0 bg-surface-1 border border-zinc-800 rounded-lg p-3 flex flex-col overflow-hidden">
          <RateTable onStats={setExtraStats} />
        </div>

        {/* Right 40% — Agent feeds */}
        <div className="w-[38%] shrink-0 flex flex-col gap-3 overflow-hidden">
          {/* Agent feed top */}
          <div className="flex-1 bg-surface-1 border border-zinc-800 rounded-lg p-3 flex flex-col overflow-hidden">
            <AgentFeed />
          </div>

          {/* Swap feed bottom */}
          <div className="flex-1 bg-surface-1 border border-zinc-800 rounded-lg p-3 flex flex-col overflow-hidden">
            <SwapFeed />
          </div>
        </div>
      </main>
    </div>
  )
}
