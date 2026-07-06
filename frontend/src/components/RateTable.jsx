import { useState, useEffect, useMemo, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const MAJOR_PAIRS = new Set([
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'USD/CAD', 'AUD/USD', 'NZD/USD',
  'EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/AUD', 'GBP/JPY', 'AUD/JPY',
  'USD/MXN', 'USD/TRY', 'USD/ZAR', 'USD/NGN', 'USD/SGD', 'USD/HKD', 'USD/INR',
])

function staleness(ts) {
  const age = Date.now() / 1000 - ts
  if (age < 300) return 'green'
  if (age < 900) return 'yellow'
  return 'red'
}

function timeAgo(ts) {
  const s = Math.floor(Date.now() / 1000 - ts)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

function ColorDot({ color }) {
  const cls = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }[color]
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${cls} mr-1.5`} />
}

export default function RateTable({ onStats }) {
  const [rates, setRates] = useState([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('pair')
  const [sortDir, setSortDir] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const tableBodyRef = useRef(null)

  const fetchRates = async () => {
    try {
      const resp = await fetch(`${API_BASE}/fx/rates/snapshot`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      setRates(data.rates || [])
      onStats?.({ pair_count: data.count })
    } catch (e) {
      console.error('rate fetch error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
    const id = setInterval(fetchRates, 30000)
    return () => clearInterval(id)
  }, [])

  const handleSort = key => {
    if (sortKey === key) setSortDir(d => -d)
    else { setSortKey(key); setSortDir(1) }
  }

  const filtered = useMemo(() => {
    const q = search.toUpperCase()
    const base = showAll ? rates : rates.filter(r => MAJOR_PAIRS.has(r.pair))
    return base
      .filter(r => !q || r.pair.includes(q))
      .sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey]
        if (typeof av === 'string') av = av.toLowerCase()
        if (typeof bv === 'string') bv = bv.toLowerCase()
        if (av == null) return 1
        if (bv == null) return -1
        return av < bv ? -sortDir : av > bv ? sortDir : 0
      })
  }, [rates, search, sortKey, sortDir, showAll])

  const SortHeader = ({ label, field }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-3 py-2 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-pointer select-none hover:text-zinc-300 transition-colors"
    >
      {label}
      {sortKey === field && (
        <span className="ml-1 text-zinc-400">{sortDir > 0 ? '↑' : '↓'}</span>
      )}
    </th>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search pair..."
          className="flex-1 bg-surface-2 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        />
        <span className="text-xs text-zinc-600 shrink-0">{filtered.length} pairs</span>
        <button
          onClick={() => setShowAll(s => !s)}
          className="shrink-0 px-2 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
        >
          {showAll ? `Majors only` : `Show all ${rates.length}`}
        </button>
        {loading && <span className="text-xs text-zinc-500">loading...</span>}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-surface-1 z-10">
            <tr className="border-b border-zinc-800">
              <SortHeader label="Pair" field="pair" />
              <SortHeader label="Rate" field="rate" />
              <SortHeader label="Bid" field="bid" />
              <SortHeader label="Ask" field="ask" />
              <SortHeader label="Spread" field="spread" />
              <SortHeader label="Source" field="source" />
              <SortHeader label="Updated" field="timestamp" />
              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody ref={tableBodyRef}>
            {filtered.map(r => {
              const color = r.timestamp && !r.stale ? staleness(r.timestamp) : 'red'
              const statusLabel = r.stale
                ? 'stale'
                : color === 'green' ? 'live'
                : color === 'yellow' ? 'aging' : 'stale'
              return (
                <tr
                  key={r.pair}
                  className="border-b border-zinc-900 hover:bg-surface-2 transition-colors"
                >
                  <td className="px-3 py-1.5 font-medium text-zinc-200">{r.pair}</td>
                  <td className="px-3 py-1.5 text-zinc-300 tabular-nums">
                    {r.rate != null ? r.rate.toFixed(6) : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-400 tabular-nums">
                    {r.bid != null ? r.bid.toFixed(6) : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-400 tabular-nums">
                    {r.ask != null ? r.ask.toFixed(6) : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-500 tabular-nums">
                    {r.spread != null ? r.spread.toFixed(6) : '—'}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      r.source === 'yahoo' ? 'bg-blue-900 text-blue-300' :
                      r.source === 'twelvedata' ? 'bg-purple-900 text-purple-300' :
                      'bg-zinc-800 text-zinc-500'
                    }`}>
                      {r.source || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-zinc-500">
                    {r.timestamp ? timeAgo(r.timestamp) : '—'}
                  </td>
                  <td className="px-3 py-1.5">
                    <ColorDot color={color} />
                    <span className={`text-xs ${
                      color === 'green' ? 'text-green-500' :
                      color === 'yellow' ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-zinc-600">
                  No pairs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
