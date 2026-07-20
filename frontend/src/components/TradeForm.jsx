import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const MAJOR_PAIRS = [
  'EUR/USD','GBP/USD','USD/JPY','USD/CHF','USD/CAD','AUD/USD','NZD/USD',
  'EUR/GBP','EUR/JPY','EUR/CHF','GBP/JPY','AUD/JPY','EUR/AUD',
  'USD/MXN','USD/TRY','USD/ZAR','USD/NGN','USD/SGD','USD/HKD','USD/INR',
]

export default function TradeForm({ publicKey, walletLabel = 'Casper Wallet', onClose, onSubmitted }) {
  const [pair, setPair]         = useState('EUR/USD')
  const [direction, setDir]     = useState('BUY')
  const [amount, setAmount]     = useState('')
  const [submitting, setSub]    = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState(null)
  const [liveRate, setLiveRate] = useState(null)

  // Fetch live rate for selected pair
  useEffect(() => {
    setLiveRate(null)
    const [base, quote] = pair.split('/')
    fetch(`${API_BASE}/fx/rates/snapshot`)
      .then(r => r.json())
      .then(d => {
        const row = d.rates?.find(r => r.pair === pair)
        setLiveRate(row?.rate ?? null)
      })
      .catch(() => {})
  }, [pair])

  const notional = liveRate && amount
    ? (parseFloat(amount) * liveRate).toFixed(2)
    : null

  const submit = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Enter a valid amount')
      return
    }
    setSub(true)
    setError(null)
    try {
      const resp = await fetch(`${API_BASE}/trade/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_key: publicKey,
          pair,
          direction,
          amount: parseFloat(amount),
        }),
      })
      if (!resp.ok) {
        const e = await resp.json()
        throw new Error(e.error || `HTTP ${resp.status}`)
      }
      const data = await resp.json()
      setResult(data)
      onSubmitted?.(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setSub(false)
    }
  }

  const short = publicKey ? `${publicKey.slice(0, 8)}…${publicKey.slice(-4)}` : ''

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#111113] border border-zinc-700 rounded-xl w-full max-w-sm mx-4 p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">New Trade Request</h2>
            <p className="text-xs text-zinc-600 mt-0.5">Settler agent executes on Casper testnet within ~35s</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 text-lg leading-none">×</button>
        </div>

        {/* Wallet badge */}
        <div className="flex items-center gap-2 mb-4 px-2 py-1.5 bg-zinc-900 rounded border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs text-zinc-400 font-mono">{short}</span>
          <span className="ml-auto text-xs text-zinc-600">{walletLabel}</span>
        </div>

        {result ? (
          /* Success state */
          <div className="text-center py-4">
            <div className="text-green-400 text-2xl mb-2">✓</div>
            <p className="text-sm text-zinc-200 font-medium mb-1">Trade submitted</p>
            <p className="text-xs text-zinc-500 mb-1">
              {result.direction} {result.pair} · {result.amount.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-600">req #{result.req_id} · Casper tx in ~35s</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-1.5 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Pair selector */}
            <div className="mb-3">
              <label className="block text-xs text-zinc-500 mb-1">Currency Pair</label>
              <select
                value={pair}
                onChange={e => setPair(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-600"
              >
                {MAJOR_PAIRS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {liveRate && (
                <p className="text-xs text-zinc-600 mt-1 font-mono">
                  Live rate: <span className="text-zinc-400">{liveRate.toFixed(6)}</span>
                </p>
              )}
            </div>

            {/* Direction toggle */}
            <div className="mb-3">
              <label className="block text-xs text-zinc-500 mb-1">Direction</label>
              <div className="flex rounded overflow-hidden border border-zinc-700">
                {['BUY','SELL'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDir(d)}
                    className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                      direction === d
                        ? d === 'BUY'
                          ? 'bg-green-900 text-green-300 border-green-700'
                          : 'bg-red-900 text-red-300 border-red-700'
                        : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-xs text-zinc-500 mb-1">
                Amount <span className="text-zinc-700">({pair.split('/')[0]})</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 10000"
                min="1"
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-cyan-600"
              />
              {notional && (
                <p className="text-xs text-zinc-600 mt-1">
                  ≈ <span className="text-zinc-400">{parseFloat(notional).toLocaleString()}</span> {pair.split('/')[1]}
                </p>
              )}
            </div>

            {error && (
              <p className="text-xs text-red-400 mb-3">{error}</p>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full py-2.5 rounded text-sm font-semibold bg-cyan-900 border border-cyan-700 text-cyan-200 hover:bg-cyan-800 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting…' : `Submit ${direction} Order`}
            </button>

            <p className="text-xs text-zinc-700 text-center mt-3">
              Settler agent executes on Casper testnet within ~35s
            </p>
          </>
        )}
      </div>
    </div>
  )
}
