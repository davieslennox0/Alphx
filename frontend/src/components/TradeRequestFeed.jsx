import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''
const EXPLORER = 'https://testnet.cspr.live/deploy'

const AGENT_COLORS = {
  trader_a: { label: 'AFROPAY',  bg: 'bg-orange-900', text: 'text-orange-300' },
  trader_b: { label: 'SILKROAD', bg: 'bg-teal-900',   text: 'text-teal-300' },
  trader_c: { label: 'TREASURY', bg: 'bg-indigo-900', text: 'text-indigo-300' },
  settler:  { label: 'SETTLER',  bg: 'bg-cyan-900',   text: 'text-cyan-300' },
  user:     { label: 'YOU',      bg: 'bg-yellow-900', text: 'text-yellow-300' },
}

const STATUS_COLORS = {
  OPEN:      'text-yellow-500',
  SETTLED:   'text-green-400',
  MATCHED:   'text-blue-400',
  CANCELLED: 'text-red-400',
}

const DIR_COLORS = { BUY: 'text-green-400', SELL: 'text-red-400' }

function fmt(ts) {
  return new Date(ts * 1000).toTimeString().slice(0, 8)
}

function fmtAmt(n) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return n.toFixed(0)
}

export default function TradeRequestFeed() {
  const [trades, setTrades] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const r = await fetch(`${API_BASE}/agent/trades/recent`)
        if (!r.ok) return
        const d = await r.json()
        setTrades((d.trades || []).slice(-10))
      } catch {}
    }
    fetch_()
    const id = setInterval(fetch_, 4000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [trades])

  const open     = trades.filter(t => t.status === 'OPEN').length
  const settled  = trades.filter(t => t.status === 'SETTLED').length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Trade Requests</span>
        <span className="ml-auto flex gap-2 text-xs">
          <span className="text-yellow-500">{open} open</span>
          <span className="text-green-500">{settled} settled</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-0.5">
        {trades.length === 0 && (
          <div className="text-zinc-700 py-2 text-center text-xs">Waiting for trade requests...</div>
        )}
        {trades.map((t, i) => {
          const ac = AGENT_COLORS[t.agent] || { label: (t.agent||'').toUpperCase(), bg: 'bg-zinc-800', text: 'text-zinc-400' }
          return (
            <div key={t.id ?? i} className="px-1.5 py-1 rounded hover:bg-surface-2 border border-transparent hover:border-zinc-800">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-zinc-700 shrink-0">{fmt(t.timestamp)}</span>
                <span className={`shrink-0 px-1 rounded text-xs leading-4 ${ac.bg} ${ac.text}`}>{ac.label}</span>
                <span className={`shrink-0 font-bold text-xs ${DIR_COLORS[t.direction] || 'text-zinc-400'}`}>{t.direction}</span>
                <span className="text-zinc-200 shrink-0">{t.pair}</span>
                <span className="text-zinc-500 shrink-0">{fmtAmt(t.amount)}</span>
                <span className="flex-1" />
                <span className={`shrink-0 text-xs ${STATUS_COLORS[t.status] || 'text-zinc-500'}`}>{t.status}</span>
              </div>
              {t.status === 'SETTLED' && t.tx_hash && (
                <div className="pl-1 mt-0.5">
                  <span className="text-zinc-700">tx: </span>
                  <a
                    href={`${EXPLORER}/${t.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                  >
                    {t.tx_hash.slice(0, 12)}…{t.tx_hash.slice(-6)}
                  </a>
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
