function fmtDollars(n) {
  if (n == null) return '…'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export default function MetricCards({ health }) {
  const CARDS = [
    {
      label:  'Total Value Settled',
      value:  fmtDollars(health?.volume_total),
      sub:    health ? `${health.total_settled.toLocaleString()} settlements all-time` : 'Loading…',
      border: 'border-t-green-500',
      color:  'text-green-400',
      arrow:  true,
    },
    {
      label:  '24h Trading Volume',
      value:  fmtDollars(health?.volume_24h),
      sub:    health ? `${(health.count_24h ?? health.swaps_executed ?? 0).toLocaleString()} trades today` : 'Loading…',
      border: 'border-t-blue-500',
      color:  'text-blue-400',
      arrow:  true,
    },
    {
      label:  'Avg Settlement Time',
      value:  '~8s',
      sub:    'Casper Deterministic Finality',
      border: 'border-t-purple-500',
      color:  'text-purple-400',
      arrow:  false,
    },
    {
      label:  'Active AI Agents',
      value:  '8',
      sub:    'Yahoo · 12Data · Core · Traders · Settler',
      border: 'border-t-orange-500',
      color:  'text-orange-400',
      arrow:  false,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {CARDS.map(c => (
        <div
          key={c.label}
          className={`bg-[#111] border border-zinc-800 border-t-2 ${c.border} rounded-lg px-3 py-2.5`}
        >
          <div className="flex items-start justify-between gap-1">
            <div className={`text-lg font-bold tabular-nums leading-none ${c.color}`}>
              {c.value}
            </div>
            {c.arrow && (
              <span className="text-green-400 text-xs font-bold mt-0.5">↑</span>
            )}
          </div>
          <div className="text-xs text-zinc-300 font-medium mt-1">{c.label}</div>
          <div className="text-xs text-zinc-600 mt-0.5 truncate">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
