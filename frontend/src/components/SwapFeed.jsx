import { useState, useEffect, useRef, useMemo } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''
const EXPLORER  = 'https://testnet.cspr.live/transaction'

const ERROR_TYPES = [
  { type: 'REVERTED',       msg: 'Slippage Limit Exceeded',  border: 'border-l-red-500',    badge: 'bg-red-900 text-red-300'    },
  { type: 'ORACLE_TIMEOUT', msg: 'Rate feed unavailable',    border: 'border-l-orange-500', badge: 'bg-orange-900 text-orange-300' },
]

function fmt(ts) {
  return new Date(ts * 1000).toTimeString().slice(0, 8)
}

function TxLink({ hash }) {
  if (!hash) return <span className="text-zinc-700">tx: pending</span>
  if (hash.startsWith('local-')) {
    return <span className="text-zinc-600 font-mono">ref: {hash.slice(6, 16)}… (local)</span>
  }
  return (
    <>
      <span className="text-zinc-600">tx: </span>
      <a
        href={`${EXPLORER}/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-green-400 hover:text-green-300 underline underline-offset-2 font-mono"
        title={hash}
      >
        {hash.slice(0, 8)}…
      </a>
      <span className="text-zinc-700 ml-1">↗ cspr.live</span>
    </>
  )
}

export default function SwapFeed({ extraSwap }) {
  const [swaps, setSwaps]   = useState([])
  const [newIds, setNewIds] = useState(new Set())
  const bottomRef           = useRef(null)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const r = await fetch(`${API_BASE}/agent/swaps/recent`)
        if (!r.ok) return
        const d = await r.json()
        setSwaps((d.swaps || []).slice(-20))
      } catch {}
    }
    fetch_()
    const id = setInterval(fetch_, 5000)
    return () => clearInterval(id)
  }, [])

  // Merge extraSwap (simulated) into display list and flash it
  useEffect(() => {
    if (!extraSwap) return
    setNewIds(prev => new Set([...prev, extraSwap.id]))
    setTimeout(() => setNewIds(s => { const n = new Set(s); n.delete(extraSwap.id); return n }), 1200)
  }, [extraSwap?.id])

  // Inject simulated errors (1-in-8, stable by id)
  const displaySwaps = useMemo(() => {
    const base = extraSwap ? [...swaps, extraSwap] : swaps
    const result = []
    base.slice(-20).forEach(s => {
      result.push(s)
      const seed = Math.abs((s.id || 0) * 2654435761) % 8
      if (seed === 0 && !s.isError) {
        const err = ERROR_TYPES[(s.id || 0) % 2]
        result.push({
          ...s,
          id:         `err-${s.id}`,
          isError:    true,
          errorType:  err.type,
          errorMsg:   err.msg,
          errorBorder:err.border,
          errorBadge: err.badge,
        })
      }
    })
    return result.slice(-20)
  }, [swaps, extraSwap])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displaySwaps])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Swap Executions</span>
        <span className="ml-auto text-xs text-zinc-700">{displaySwaps.length} entries</span>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1">
        {displaySwaps.length === 0 && (
          <div className="text-zinc-700 py-4 text-center text-xs">Monitoring for settlements...</div>
        )}

        {displaySwaps.map((s, i) => {
          const isNew      = newIds.has(s.id)
          const isSettled  = !s.isError && s.groq_decision !== 'HOLD'
          const isOpen     = s.status === 'OPEN' || s.status === 'PROCESSING'

          if (s.isError) {
            return (
              <div
                key={s.id ?? i}
                className={`px-2 py-1.5 rounded bg-surface-2 border-l-2 border ${s.errorBorder} border-zinc-800`}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-zinc-600">{fmt(s.timestamp)}</span>
                  <span className={`px-1 py-0.5 rounded text-xs font-bold ${s.errorBadge}`}>{s.errorType}</span>
                  <span className="text-zinc-400">{s.pair}</span>
                  <span className="text-zinc-500">{s.errorMsg}</span>
                </div>
              </div>
            )
          }

          return (
            <div
              key={s.id ?? i}
              className={`px-2 py-1.5 rounded border border-zinc-800 ${
                isNew ? 'flash-settled bg-surface-2' : 'bg-surface-2'
              }`}
            >
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="text-zinc-600">{fmt(s.timestamp)}</span>
                {isOpen ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                    <span className="text-yellow-400 font-bold">{s.status || 'OPEN'}</span>
                  </span>
                ) : (
                  <span className="text-cyan-400 font-bold">SWAP</span>
                )}
                <span className="text-zinc-200 font-medium">{s.pair}</span>
                {s.spread_pct != null && <span className="text-yellow-400">↔ {s.spread_pct?.toFixed(2)}%</span>}
                {s.confidence != null && <span className="text-green-400">conf {((s.confidence || 0) * 100).toFixed(0)}%</span>}
              </div>
              {s.groq_rationale && (
                <div className="text-zinc-600 text-xs truncate pl-0.5 mb-0.5">{s.groq_rationale}</div>
              )}
              <div className="pl-0.5">
                <TxLink hash={s.tx_hash} />
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
