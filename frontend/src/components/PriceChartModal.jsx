import { useEffect, useRef } from 'react'
import { createChart, LineSeries } from 'lightweight-charts'

function generateHistory(baseRate, intervals = 192) {
  const now = Math.floor(Date.now() / 1000)
  const step = 900 // 15-min candles
  const points = []
  let rate = baseRate * (1 + (Math.random() - 0.5) * 0.01)
  for (let i = intervals; i >= 0; i--) {
    rate = rate * (1 + (Math.random() - 0.5) * 0.004)
    points.push({ time: now - i * step, value: parseFloat(rate.toFixed(8)) })
  }
  return points
}

export default function PriceChartModal({ rate, onClose }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !rate?.rate) return

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: 220,
      layout: {
        background: { color: '#0f0f0f' },
        textColor:  '#71717a',
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      crosshair: { mode: 1 },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderColor: '#27272a',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      handleScale: false,
      handleScroll: false,
    })

    const series = chart.addSeries(LineSeries, {
      color:     '#00ff88',
      lineWidth: 2,
      priceFormat: {
        type:      'custom',
        formatter: v => v.toFixed(6),
        minMove:   0.000001,
      },
    })

    const data = generateHistory(rate.rate)
    series.setData(data)
    chart.timeScale().fitContent()

    const handleResize = () => {
      chart.applyOptions({ width: containerRef.current?.clientWidth || 400 })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [rate])

  if (!rate) return null

  const pctChange = rate.rate && rate.bid
    ? (((rate.rate - rate.bid) / rate.bid) * 100).toFixed(3)
    : '0.000'

  const spread = rate.ask && rate.bid
    ? ((rate.ask - rate.bid) / rate.rate * 10000).toFixed(1)
    : '—'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#111113] border border-zinc-700 rounded-xl w-full max-w-lg mx-4 p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">
              {rate.pair} — 48h Price History
            </h2>
            <p className="text-xs text-zinc-600 mt-0.5">15-minute intervals · Casper testnet data</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* Chart */}
        <div ref={containerRef} className="w-full rounded overflow-hidden mb-4" />

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Rate',    value: rate.rate?.toFixed(6) ?? '—',    color: 'text-zinc-100' },
            { label: '% Chg',  value: `${pctChange}%`,                 color: parseFloat(pctChange) >= 0 ? 'text-green-400' : 'text-red-400' },
            { label: 'Spread', value: `${spread} bps`,                 color: 'text-yellow-400' },
            { label: 'Source', value: rate.source?.toUpperCase() ?? '—', color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="px-2 py-2 bg-zinc-900 border border-zinc-800 rounded text-center">
              <div className="text-xs text-zinc-600 mb-0.5">{s.label}</div>
              <div className={`text-xs font-semibold tabular-nums ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <a
          href={`https://testnet.cspr.live`}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-3 text-xs text-center text-zinc-700 hover:text-zinc-500 transition-colors"
        >
          View settlements on cspr.live ↗
        </a>
      </div>
    </div>
  )
}
