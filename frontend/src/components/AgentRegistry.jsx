const AGENTS = [
  {
    name:    'AfroPay Corp Settlement Agent',
    role:    'trader_a',
    color:   'text-orange-400',
    dot:     'bg-orange-500',
    desc:    'Automates regional liquidity balancing between USD and NGN based on algorithmic spreads',
    trades:  47,
    address: '01' + 'a4f9'.repeat(16),
  },
  {
    name:    'Treasury AI Optimizer',
    role:    'trader_c',
    color:   'text-indigo-400',
    dot:     'bg-indigo-500',
    desc:    'Monitors EUR/USD and GBP/USD pairs for institutional rebalancing windows',
    trades:  31,
    address: '01' + 'e2c7'.repeat(16),
  },
  {
    name:    'Emerging Markets Arbitrage Bot',
    role:    'trader_b',
    color:   'text-teal-400',
    dot:     'bg-teal-500',
    desc:    'Identifies cross-pair arbitrage opportunities across African and Asian FX corridors',
    trades:  28,
    address: '01' + 'b8d1'.repeat(16),
  },
]

export default function AgentRegistry({ onClose }) {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full z-50 w-80 bg-[#111113] border-l border-zinc-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 h-12 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Agent Registry</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Agents */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {AGENTS.map(a => (
            <div
              key={a.name}
              className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`text-xs font-bold ${a.color}`}>{a.name}</span>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${a.dot} animate-pulse`} />
                  <span className="text-xs text-green-400">ACTIVE</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed mb-3">{a.desc}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-zinc-600 mb-0.5">Trades today</div>
                  <div className="text-zinc-200 font-semibold">{a.trades}</div>
                </div>
                <div>
                  <div className="text-zinc-600 mb-0.5">Role</div>
                  <div className="text-zinc-400">{a.role}</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-zinc-800">
                <div className="text-zinc-600 text-xs mb-0.5">Casper address</div>
                <div className="text-xs font-mono text-zinc-500 truncate">{a.address.slice(0,20)}…</div>
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 p-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-600 text-center">
            All agents run autonomously · No human intervention
          </p>
        </div>
      </div>
    </>
  )
}
