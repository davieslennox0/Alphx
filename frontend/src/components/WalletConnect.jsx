import { useState, useEffect, useCallback } from 'react'

export function useWallet() {
  const [publicKey, setPublicKey] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  const provider = () => {
    if (typeof window === 'undefined') return null
    return window.CasperWalletProvider?.()
  }

  // Sync active key on load
  useEffect(() => {
    const p = provider()
    if (!p) return
    p.getActivePublicKey()
      .then(k => k && setPublicKey(k))
      .catch(() => {})

    const onConnect    = e => setPublicKey(e.detail?.activeKey || null)
    const onDisconnect = ()  => setPublicKey(null)
    const onKeyChange  = e => setPublicKey(e.detail?.activeKey || null)

    window.addEventListener('casper-wallet:connected',       onConnect)
    window.addEventListener('casper-wallet:disconnected',    onDisconnect)
    window.addEventListener('casper-wallet:activeKeyChanged',onKeyChange)
    return () => {
      window.removeEventListener('casper-wallet:connected',       onConnect)
      window.removeEventListener('casper-wallet:disconnected',    onDisconnect)
      window.removeEventListener('casper-wallet:activeKeyChanged',onKeyChange)
    }
  }, [])

  const connect = useCallback(async () => {
    const p = provider()
    if (!p) {
      setError('Casper Wallet extension not found. Install it from casper.network/casper-wallet')
      return
    }
    setConnecting(true)
    setError(null)
    try {
      await p.requestConnection()
      const key = await p.getActivePublicKey()
      setPublicKey(key)
    } catch (e) {
      setError(e?.message || 'Connection cancelled')
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    const p = provider()
    try { await p?.disconnectFromSite() } catch {}
    setPublicKey(null)
  }, [])

  return { publicKey, connecting, error, connect, disconnect }
}

export default function WalletConnect({ onConnected, onTrade }) {
  const { publicKey, connecting, error, connect, disconnect } = useWallet()

  useEffect(() => {
    onConnected?.(publicKey)
  }, [publicKey])

  const short = publicKey
    ? `${publicKey.slice(0, 8)}…${publicKey.slice(-4)}`
    : null

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-400 max-w-[200px] truncate" title={error}>{error}</span>
      )}

      {publicKey ? (
        <>
          <button
            onClick={onTrade}
            className="flex items-center h-6 px-2.5 text-xs rounded bg-cyan-900 border border-cyan-700 text-cyan-300 hover:bg-cyan-800 transition-colors font-medium whitespace-nowrap"
          >
            + New Trade
          </button>
          <button
            onClick={disconnect}
            className="flex items-center gap-1.5 h-6 px-2.5 text-xs rounded bg-surface-2 border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors whitespace-nowrap"
            title="Disconnect wallet"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            {short}
          </button>
        </>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          className="flex items-center gap-1.5 h-6 px-2.5 text-xs rounded bg-surface-2 border border-zinc-600 text-zinc-300 hover:border-cyan-600 hover:text-cyan-300 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          {connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}
