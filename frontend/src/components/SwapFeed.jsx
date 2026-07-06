import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''
// Casper 2.0 uses /transaction/ path for native transfers
const EXPLORER = 'https://testnet.cspr.live/transaction'

function fmt(ts) {
  return new Date(ts * 1000).toTimeString().slice(0, 8)
}

export default function SwapFeed() {
  const [swaps, setSwaps] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const r = await fetch(`${API_BASE}/agent/swaps/recent`)
        if (!r.ok) return
        const d = await r.json()
        setSwaps((d.swaps || []).slice(-10))
      } catch {}
    }
    fetch_()
    const id = setInterval(fetch_, 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [swaps])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Swap Executions</span>
        <span className="ml-auto text-xs text-zinc-700">{swaps.length} swaps</span>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1">
        {swaps.length === 0 && (
          <div className="text-zinc-700 py-4 text-center text-xs">Monitoring for settlements...</div>
        )}
        {swaps.map((s, i) => (
          <div key={s.id ?? i} className="px-2 py-1.5 rounded bg-surface-2 border border-zinc-800">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className="text-zinc-600">{fmt(s.timestamp)}</span>
              <span className="text-cyan-400 font-bold">SWAP</span>
              <span className="text-zinc-200 font-medium">{s.pair}</span>
              <span className="text-yellow-400">↔ {s.spread_pct?.toFixed(2)}%</span>
              <span className="text-green-400">conf {((s.confidence || 0) * 100).toFixed(0)}%</span>
            </div>
            <div className="text-zinc-600 text-xs truncate pl-0.5 mb-0.5">
              {s.groq_rationale || s.groq_decision}
            </div>
            <div className="pl-0.5">
              {s.tx_hash ? (
                s.tx_hash.startsWith('local-') ? (
                  <span className="text-zinc-600 text-xs">ref: {s.tx_hash.slice(6, 20)}… (local)</span>
                ) : (
                  <>
                    <span className="text-zinc-600">tx: </span>
                    <a
                      href={`${EXPLORER}/${s.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                    >
                      {s.tx_hash.slice(0, 14)}…{s.tx_hash.slice(-6)}
                    </a>
                    <span className="text-zinc-700 ml-1">↗ cspr.live</span>
                    <span className="ml-1 text-zinc-700 text-xs">
                      {s.pair ? `[${s.pair.replace('/', '')} token]` : ''}
                    </span>
                  </>
                )
              ) : (
                <span className="text-zinc-700">tx: pending</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
