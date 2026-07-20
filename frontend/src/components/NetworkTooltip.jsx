import { useState } from 'react'

export default function NetworkTooltip({ contractHash }) {
  const [show, setShow] = useState(false)

  const shortHash = contractHash
    ? `${contractHash.slice(0, 12)}…`
    : 'not set'

  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <a
        href="https://testnet.cspr.live"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:flex items-center gap-1 px-2 h-5 rounded-full border border-red-800 bg-red-950/40 text-red-400 text-xs font-medium whitespace-nowrap hover:border-red-600 transition-colors shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Casper Testnet
      </a>

      {show && (
        <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-[#111113] border border-zinc-700 rounded-lg p-3 shadow-2xl">
          {/* Arrow */}
          <div className="absolute -top-1.5 left-4 w-3 h-3 bg-[#111113] border-l border-t border-zinc-700 rotate-45" />

          <div className="space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Network</span>
              <span className="text-xs font-medium text-zinc-200">Casper Testnet</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Finality</span>
              <span className="text-xs text-green-400">~8s (deterministic)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Contract</span>
              <span className="text-xs font-mono text-zinc-400">{shortHash}</span>
            </div>
            <div className="pt-1 border-t border-zinc-800 flex flex-col gap-1">
              <a
                href="https://testnet.cspr.live"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View on cspr.live ↗
              </a>
              <a
                href="https://testnet.cspr.live/faucet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                Get Testnet CSPR ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
