import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const AGENT_STYLES = {
  yahoo:      { label: 'YAHOO',    color: 'text-blue-400',   border: 'border-l-blue-500',   dot: 'bg-blue-500'   },
  twelvedata: { label: '12DATA',   color: 'text-purple-400', border: 'border-l-purple-500', dot: 'bg-purple-500' },
  aggregator: { label: 'CORE',     color: 'text-green-400',  border: 'border-l-green-500',  dot: 'bg-green-500'  },
  publisher:  { label: 'PUB',      color: 'text-yellow-400', border: 'border-l-yellow-500', dot: 'bg-yellow-500' },
  trader_a:   { label: 'AFROPAY',  color: 'text-orange-400', border: 'border-l-orange-500', dot: 'bg-orange-500' },
  trader_b:   { label: 'SILKROAD', color: 'text-teal-400',   border: 'border-l-teal-500',   dot: 'bg-teal-500'   },
  trader_c:   { label: 'TREASURY', color: 'text-indigo-400', border: 'border-l-indigo-500', dot: 'bg-indigo-500' },
  settler:    { label: 'SETTLER',  color: 'text-cyan-400',   border: 'border-l-cyan-500',   dot: 'bg-cyan-500'   },
  user:       { label: 'YOU',      color: 'text-yellow-400', border: 'border-l-yellow-500', dot: 'bg-yellow-500' },
}

function fmt(ts) {
  return new Date(ts * 1000).toTimeString().slice(0, 8)
}

export default function AgentFeed() {
  const [entries, setEntries]   = useState([])
  const [newIds, setNewIds]     = useState(new Set())
  const bottomRef               = useRef(null)

  useEffect(() => {
    let lastId    = 0
    let intervalId = null

    const fetchRecent = async () => {
      try {
        const r = await fetch(`${API_BASE}/agent/feed/recent`)
        if (!r.ok) return
        const d = await r.json()
        const logs = d.logs || []
        if (logs.length) {
          setEntries(logs.slice(-20))
          lastId = logs[logs.length - 1].id
        }
      } catch {}
    }

    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/agent/feed/since?after=${lastId}`)
        if (!r.ok) return
        const d = await r.json()
        const logs = d.logs || []
        if (logs.length) {
          const incoming = logs.map(l => l.id)
          lastId = logs[logs.length - 1].id
          setEntries(prev => [...prev, ...logs].slice(-20))
          setNewIds(prev => {
            const next = new Set([...prev, ...incoming])
            // Clear after animation
            setTimeout(() => setNewIds(s => {
              const cleared = new Set(s)
              incoming.forEach(id => cleared.delete(id))
              return cleared
            }), 600)
            return next
          })
        }
      } catch {}
    }

    fetchRecent().then(() => { intervalId = setInterval(poll, 3000) })
    return () => { if (intervalId) clearInterval(intervalId) }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  // Collect active agent names for pulsing dots in header
  const activeAgents = [...new Set(entries.slice(-5).map(e => e.agent).filter(Boolean))]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1.5 px-1 flex-wrap">
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Agent Activity</span>
        <div className="flex gap-1 ml-1">
          {activeAgents.slice(0, 4).map(a => {
            const s = AGENT_STYLES[a]
            return s ? (
              <span key={a} className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} title={s.label} />
            ) : null
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-0.5">
        {entries.length === 0 && (
          <div className="text-zinc-700 py-2 text-center text-xs">Waiting...</div>
        )}
        {entries.map((entry, i) => {
          const s = AGENT_STYLES[entry.agent] || {
            label:  (entry.agent || '').slice(0, 8).toUpperCase(),
            color:  'text-zinc-400',
            border: 'border-l-zinc-700',
            dot:    'bg-zinc-600',
          }
          const isNew = newIds.has(entry.id)
          return (
            <div
              key={entry.id ?? i}
              className={`flex gap-1.5 py-0.5 px-1.5 rounded border-l-2 ${s.border} hover:bg-surface-2 min-w-0 ${isNew ? 'animate-fade-in-down' : ''}`}
            >
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
