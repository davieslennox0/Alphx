import { useState } from 'react'

function genAddress() {
  const hex = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
  return `01${hex}`
}

function genName() {
  return `Sandbox Wallet #${Math.floor(1000 + Math.random() * 9000)}`
}

export default function SandboxWallet({ wallet, onConnected, onDisconnect }) {
  const [showModal, setShowModal] = useState(false)
  const [pending, setPending]     = useState(null)

  const open = () => {
    setPending({ address: genAddress(), name: genName() })
    setShowModal(true)
  }

  const confirm = () => {
    onConnected(pending)
    setShowModal(false)
  }

  if (wallet) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
        <span className="text-xs text-zinc-300 whitespace-nowrap">{wallet.name}</span>
        <button
          onClick={onDisconnect}
          className="text-xs text-zinc-600 hover:text-zinc-400 underline underline-offset-2 whitespace-nowrap"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={open}
        className="flex items-center gap-1.5 h-6 px-2.5 text-xs rounded bg-surface-2 border border-zinc-700 text-zinc-400 hover:border-green-700 hover:text-green-300 transition-colors whitespace-nowrap shrink-0"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
        Connect Sandbox Wallet
      </button>

      {showModal && pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-[#111113] border border-zinc-700 rounded-xl w-full max-w-sm mx-4 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-100">Sandbox Wallet</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-600 hover:text-zinc-300 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-3 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded">
              <div className="text-xs text-zinc-500 mb-1">Testnet Address</div>
              <div className="font-mono text-xs text-zinc-200 break-all leading-relaxed">
                {pending.address}
              </div>
            </div>

            <div className="flex items-center justify-between mb-3 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded">
              <div>
                <div className="text-xs text-zinc-500 mb-0.5">Balance</div>
                <div className="text-sm font-semibold text-cyan-400">10,000 CSPR</div>
              </div>
              <span className="text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded">
                Testnet
              </span>
            </div>

            <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-green-950/30 border border-green-900 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-300 font-medium">{pending.name}</span>
            </div>

            <button
              onClick={confirm}
              className="w-full py-2.5 rounded text-sm font-semibold bg-green-900 border border-green-700 text-green-200 hover:bg-green-800 transition-colors"
            >
              Start Trading
            </button>
            <p className="text-xs text-zinc-700 text-center mt-2">
              No extension required · Resets on page refresh
            </p>
          </div>
        </div>
      )}
    </>
  )
}
