import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const AGENT_STYLES = {
  yahoo:      { label: 'YAHOO',    color: 'text-blue-400',   dot: 'bg-blue-400' },
  twelvedata: { label: '12DATA',   color: 'text-purple-400', dot: 'bg-purple-400' },
  aggregator: { label: 'CORE',     color: 'text-green-400',  dot: 'bg-green-400' },
}

function fmt(ts) {
  const d = new Date(ts * 1000)
  return d.toTimeString().slice(0, 8)
}

export default function AgentFeed() {
  const [entries, setEntries] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/agent/feed`)

    es.onmessage = e => {
      try {
        const data = JSON.parse(e.data)
        if (data.error) return
        setEntries(prev => {
          const next = [...prev, data]
          return next.slice(-100)
        })
      } catch {}
    }

    es.onerror = () => {}

    return () => es.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Agent Feed</span>
        <span className="ml-auto text-xs text-zinc-700">{entries.length} entries</span>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-0.5">
        {entries.length === 0 && (
          <div className="text-zinc-700 py-4 text-center">
            Waiting for agent activity...
          </div>
        )}
        {entries.map((entry, i) => {
          const style = AGENT_STYLES[entry.agent] || { label: entry.agent?.toUpperCase(), color: 'text-zinc-400', dot: 'bg-zinc-400' }
          return (
            <div key={entry.id ?? i} className="flex gap-2 py-0.5 px-1 rounded hover:bg-surface-2">
              <span className="text-zinc-600 shrink-0">[{fmt(entry.timestamp)}]</span>
              <span className={`shrink-0 w-14 ${style.color}`}>[{style.label}]</span>
              <span className="text-zinc-300 break-all">{entry.message}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
