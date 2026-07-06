import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const AGENT_STYLES = {
  yahoo:      { label: 'YAHOO',    color: 'text-blue-400' },
  twelvedata: { label: '12DATA',   color: 'text-purple-400' },
  aggregator: { label: 'CORE',     color: 'text-green-400' },
  trader_a:   { label: 'AFROPAY',  color: 'text-orange-400' },
  trader_b:   { label: 'SILKROAD', color: 'text-teal-400' },
  trader_c:   { label: 'TREASURY', color: 'text-indigo-400' },
  settler:    { label: 'SETTLER',  color: 'text-cyan-400' },
  user:       { label: 'YOU',      color: 'text-yellow-400' },
}

function fmt(ts) {
  return new Date(ts * 1000).toTimeString().slice(0, 8)
}

export default function AgentFeed() {
  const [entries, setEntries] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    // Bootstrap: fetch recent logs via REST so we never start from id=0
    let lastId = 0

    const fetchRecent = async () => {
      try {
        const r = await fetch(`${API_BASE}/agent/feed/recent`)
        if (!r.ok) return
        const d = await r.json()
        const logs = d.logs || []
        if (logs.length) {
          setEntries(logs.slice(-10))
          lastId = logs[logs.length - 1].id
        }
      } catch {}
    }

    // Then poll for new entries only
    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/agent/feed/since?after=${lastId}`)
        if (!r.ok) return
        const d = await r.json()
        const logs = d.logs || []
        if (logs.length) {
          lastId = logs[logs.length - 1].id
          setEntries(prev => [...prev, ...logs].slice(-10))
        }
      } catch {}
    }

    fetchRecent().then(() => {
      const id = setInterval(poll, 3000)
      return () => clearInterval(id)
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Agent Activity</span>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-0.5">
        {entries.length === 0 && (
          <div className="text-zinc-700 py-2 text-center text-xs">Waiting...</div>
        )}
        {entries.map((entry, i) => {
          const s = AGENT_STYLES[entry.agent] || { label: (entry.agent || '').slice(0, 8).toUpperCase(), color: 'text-zinc-400' }
          return (
            <div key={entry.id ?? i} className="flex gap-1.5 py-0.5 px-1 rounded hover:bg-surface-2 min-w-0">
              <span className="text-zinc-700 shrink-0">{fmt(entry.timestamp)}</span>
              <span className={`shrink-0 w-16 truncate ${s.color}`}>[{s.label}]</span>
              <span className="text-zinc-400 truncate">{entry.message}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
