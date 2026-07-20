import { useState, useEffect, useMemo, useRef } from 'react'
import PriceChartModal from './PriceChartModal'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Currency sets for tabs
const G10  = new Set(['EUR','GBP','JPY','CHF','AUD','NZD','CAD','SEK','NOK','DKK','USD'])
const EM   = new Set(['NGN','GHS','KES','ZAR','EGP','INR','BRL','MXN','IDR','PKR','PHP','VND','TRY','ARS','CLP','COP','PEN'])
const STAB = new Set(['USDT','USDC','EURC','USDP'])

function getCcy(pair) { return pair.split('/') }

const TABS = [
  { id: 'watchlist',   label: '⭐ Watchlist' },
  { id: 'g10',         label: 'G10' },
  { id: 'em',          label: 'Emerging' },
  { id: 'stablecoins', label: 'Stablecoins' },
  { id: 'all',         label: 'All Pairs' },
]

function filterByTab(rates, tab, watchlist) {
  switch (tab) {
    case 'watchlist':   return rates.filter(r => watchlist.has(r.pair))
    case 'g10':         return rates.filter(r => { const [b,q] = getCcy(r.pair); return G10.has(b) && G10.has(q) })
    case 'em':          return rates.filter(r => { const [b,q] = getCcy(r.pair); return EM.has(b)  || EM.has(q)  })
    case 'stablecoins': return rates.filter(r => { const [b,q] = getCcy(r.pair); return STAB.has(b)|| STAB.has(q)})
    default:            return rates
  }
}

function staleness(ts) {
  const age = Date.now() / 1000 - ts
  return age < 300 ? 'green' : age < 900 ? 'yellow' : 'red'
}

function timeAgo(ts) {
  const s = Math.floor(Date.now() / 1000 - ts)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

export default function RateTable({ onStats }) {
  const [rates,     setRates]     = useState([])
  const [search,    setSearch]    = useState('')
  const [sortKey,   setSortKey]   = useState('pair')
  const [sortDir,   setSortDir]   = useState(1)
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('g10')
  const [watchlist, setWatchlist] = useState(new Set())
  const [chart,     setChart]     = useState(null)

  const fetchRates = async () => {
    try {
      const resp = await fetch(`${API_BASE}/fx/rates/snapshot`)
      if (!resp.ok) throw new Error()
      const data = await resp.json()
      setRates(data.rates || [])
      onStats?.({ pair_count: data.count })
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchRates()
    const id = setInterval(fetchRates, 30000)
    return () => clearInterval(id)
  }, [])

  const toggleStar = (pair, e) => {
    e.stopPropagation()
    setWatchlist(prev => {
      const next = new Set(prev)
      next.has(pair) ? next.delete(pair) : next.add(pair)
      return next
    })
  }

  const handleSort = key => {
    setSortKey(key)
    setSortDir(d => sortKey === key ? -d : 1)
  }

  const filtered = useMemo(() => {
    const q    = search.toUpperCase()
    const base = filterByTab(rates, tab, watchlist)
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
  }, [rates, search, sortKey, sortDir, tab, watchlist])

  const SortTh = ({ label, field }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-2 py-2 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-pointer select-none hover:text-zinc-300 transition-colors"
    >
      {label}{sortKey === field && <span className="ml-1 text-zinc-400">{sortDir > 0 ? '↑' : '↓'}</span>}
    </th>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-2 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'bg-cyan-900 border border-cyan-700 text-cyan-300'
                : 'border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
            }`}
          >
            {t.label}
            {t.id === 'watchlist' && watchlist.size > 0 && (
              <span className="ml-1 text-yellow-400">{watchlist.size}</span>
            )}
          </button>
        ))}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="ml-auto w-24 bg-surface-2 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 shrink-0"
        />
        <span className="text-xs text-zinc-700 shrink-0">{filtered.length}</span>
        {loading && <span className="text-xs text-zinc-600 shrink-0">…</span>}
      </div>

      {/* Watchlist empty state */}
      {tab === 'watchlist' && watchlist.size === 0 && (
        <div className="flex-1 flex items-center justify-center text-xs text-zinc-600">
          ☆ Star pairs to pin them here
        </div>
      )}

      {/* Table */}
      {(tab !== 'watchlist' || watchlist.size > 0) && (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-surface-1 z-10">
              <tr className="border-b border-zinc-800">
                <th className="px-1 py-2 w-6" />
                <SortTh label="Pair"    field="pair" />
                <SortTh label="Rate"    field="rate" />
                <SortTh label="Bid"     field="bid" />
                <SortTh label="Ask"     field="ask" />
                <SortTh label="Spread"  field="spread" />
                <SortTh label="Src"     field="source" />
                <SortTh label="Age"     field="timestamp" />
                <th className="px-2 py-2 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const color = r.timestamp && !r.stale ? staleness(r.timestamp) : 'red'
                const statusLabel = r.stale ? 'stale' : color === 'green' ? 'live' : color === 'yellow' ? 'aging' : 'stale'
                const starred = watchlist.has(r.pair)
                return (
                  <tr
                    key={r.pair}
                    onClick={() => setChart(r)}
                    className="border-b border-zinc-900 hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    <td className="px-1 py-1.5 text-center">
                      <button
                        onClick={e => toggleStar(r.pair, e)}
                        className={`text-xs transition-colors ${starred ? 'text-yellow-400' : 'text-zinc-700 hover:text-yellow-600'}`}
                        title={starred ? 'Remove from watchlist' : 'Add to watchlist'}
                      >
                        {starred ? '★' : '☆'}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 font-medium text-zinc-200">{r.pair}</td>
                    <td className="px-2 py-1.5 text-zinc-300 tabular-nums">{r.rate != null ? r.rate.toFixed(6) : '—'}</td>
                    <td className="px-2 py-1.5 text-zinc-400 tabular-nums">{r.bid  != null ? r.bid.toFixed(6)  : '—'}</td>
                    <td className="px-2 py-1.5 text-zinc-400 tabular-nums">{r.ask  != null ? r.ask.toFixed(6)  : '—'}</td>
                    <td className="px-2 py-1.5 text-zinc-500 tabular-nums">{r.spread != null ? r.spread.toFixed(4) : '—'}</td>
                    <td className="px-2 py-1.5">
                      <span className={`px-1 py-0.5 rounded text-xs ${r.source === 'yahoo' ? 'bg-blue-900 text-blue-300' : r.source === 'twelvedata' ? 'bg-purple-900 text-purple-300' : 'bg-zinc-800 text-zinc-500'}`}>
                        {r.source || '—'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-zinc-500">{r.timestamp ? timeAgo(r.timestamp) : '—'}</td>
                    <td className="px-2 py-1.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      <span className={`text-xs ${color === 'green' ? 'text-green-500' : color === 'yellow' ? 'text-yellow-500' : 'text-red-500'}`}>{statusLabel}</span>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={9} className="px-2 py-8 text-center text-zinc-700">No pairs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {chart && <PriceChartModal rate={chart} onClose={() => setChart(null)} />}
    </div>
  )
}
