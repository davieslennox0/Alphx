import { useState } from 'react'

export default function CircuitBreaker({ healthy = true }) {
  const [show, setShow] = useState(false)

  return (
    <div
      className="relative flex items-center gap-1.5 shrink-0 cursor-default"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="text-xs select-none" title="Circuit Breaker">🛡</span>
      <span className={`text-xs font-medium whitespace-nowrap hidden lg:block ${healthy ? 'text-green-400' : 'text-red-400'}`}>
        {healthy ? 'ACTIVE' : 'TRIPPED'}
      </span>

      {show && (
        <div className="absolute top-full right-0 mt-2 z-50 w-72 bg-[#111113] border border-zinc-700 rounded-lg p-3 shadow-2xl">
          <div className="absolute -top-1.5 right-3 w-3 h-3 bg-[#111113] border-l border-t border-zinc-700 rotate-45" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span>🛡</span>
              <span className="text-xs font-semibold text-zinc-100">Circuit Breaker: {healthy ? 'ACTIVE' : 'TRIPPED'}</span>
              <span className={`ml-auto w-1.5 h-1.5 rounded-full ${healthy ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Smart contract safety mechanism — automatically halts execution if spread exceeds 5% or oracle timeout detected.
            </p>
            <div className="mt-2 pt-2 border-t border-zinc-800 grid grid-cols-2 gap-2">
              <div className="text-xs">
                <div className="text-zinc-600">Spread limit</div>
                <div className="text-zinc-300">5.0%</div>
              </div>
              <div className="text-xs">
                <div className="text-zinc-600">Oracle timeout</div>
                <div className="text-zinc-300">15 minutes</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
