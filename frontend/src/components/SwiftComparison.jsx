import { useEffect, useRef, useState } from 'react'

const ROWS = [
  { metric: 'Settlement Time',   swift: '2–3 Business Days', casper: '~8 Seconds',         casperColor: 'text-green-400' },
  { metric: 'Transaction Fee',   swift: '$25–$45 per transfer', casper: '<$0.01',           casperColor: 'text-green-400' },
  { metric: 'Availability',      swift: 'Business hours only', casper: '24/7/365',          casperColor: 'text-cyan-400'  },
  { metric: 'Transparency',      swift: 'Opaque, closed rails', casper: 'Fully on-chain',   casperColor: 'text-purple-400'},
  { metric: 'Minimum Transfer',  swift: '$1,000+',            casper: 'Any amount',         casperColor: 'text-green-400' },
]

export default function SwiftComparison({ onToggle, visible }) {
  const ref = useRef(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (!visible) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setAnimated(true); obs.disconnect() }
    }, { threshold: 0.2 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [visible])

  if (!visible) {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-xs text-zinc-600">On-Chain vs Traditional ·</span>
        <button
          onClick={onToggle}
          className="text-xs text-cyan-500 hover:text-cyan-300 transition-colors"
        >
          Show comparison ↓
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="bg-[#111] border border-zinc-800 rounded-lg p-3 overflow-x-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-bold text-zinc-100">On-Chain vs. Traditional Infrastructure</h3>
          <p className="text-xs text-zinc-600 mt-0.5">Every settlement anchored permanently on Casper Network</p>
        </div>
        <button
          onClick={onToggle}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Collapse ↑
        </button>
      </div>

      <table className="w-full text-xs border-collapse min-w-[480px]">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="py-1.5 px-2 text-left text-zinc-600 font-medium">Metric</th>
            <th className="py-1.5 px-2 text-left text-zinc-600 font-medium">SWIFT / Traditional</th>
            <th className="py-1.5 px-2 text-left text-green-600 font-medium">ALPHXC on Casper</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r, i) => (
            <tr key={r.metric} className="border-b border-zinc-900">
              <td className="py-1.5 px-2 text-zinc-400">{r.metric}</td>
              <td className="py-1.5 px-2 text-zinc-500">{r.swift}</td>
              <td
                className={`py-1.5 px-2 font-semibold ${r.casperColor} ${animated ? 'animate-count-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {r.casper}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
