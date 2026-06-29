import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''
const EXPLORER = 'https://testnet.cspr.live/deploy'

function fmt(ts) {
  const d = new Date(ts * 1000)
  return d.toTimeString().slice(0, 8)
}

export default function SwapFeed() {
  const [swaps, setSwaps] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/agent/swaps`)

    es.onmessage = e => {
      try {
        const data = JSON.parse(e.data)
        if (data.error) return
        setSwaps(prev => {
          const next = [...prev, data]
          return next.slice(-50)
        })
      } catch {}
    }

    es.onerror = () => {}

    return () => es.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [swaps])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Swap Executions</span>
        <span className="ml-auto text-xs text-zinc-700">{swaps.length} swaps</span>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1">
        {swaps.length === 0 && (
          <div className="text-zinc-700 py-4 text-center">
            Monitoring for settlement opportunities...
          </div>
        )}
        {swaps.map((s, i) => (
          <div key={s.id ?? i} className="px-2 py-1.5 rounded bg-surface-2 border border-zinc-800">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-zinc-600">[{fmt(s.timestamp)}]</span>
              <span className="text-cyan-400 font-medium">SWAP</span>
              <span className="text-zinc-200">{s.pair}</span>
              <span className="text-zinc-500">|</span>
              <span className="text-yellow-400">spread {s.spread_pct?.toFixed(2)}%</span>
              <span className="text-zinc-500">|</span>
              <span className="text-green-400">conf {((s.confidence || 0) * 100).toFixed(0)}%</span>
            </div>
            <div className="text-zinc-500 text-xs mb-0.5 pl-1">
              {s.groq_rationale || s.groq_decision}
            </div>
            {s.tx_hash ? (
              <div className="pl-1">
                <span className="text-zinc-600">tx: </span>
                <a
                  href={`${EXPLORER}/${s.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                >
                  {s.tx_hash.slice(0, 16)}...{s.tx_hash.slice(-8)}
                </a>
              </div>
            ) : (
              <div className="pl-1 text-zinc-700">tx: pending</div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
