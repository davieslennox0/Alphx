import { useNavigate } from 'react-router-dom'

const FEATURES = [
  {
    icon: '🤖',
    title: 'Autonomous AI Agents',
    desc: 'Groq-powered decision engine monitors spreads 24/7 and executes settlement swaps when conditions are met — no human in the loop.',
  },
  {
    icon: '⚡',
    title: 'x402 Micropayments',
    desc: 'AI agents pay per rate query via HTTP 402 micropayments — no subscriptions, no human wallets, no pre-approved credit lines.',
  },
  {
    icon: '⛓',
    title: 'Casper Native',
    desc: 'Deterministic finality and upgradeable smart contracts make ALPHXC the only FX settlement protocol built for enterprise on Casper.',
  },
]

const STATS = [
  { value: '3,400+', label: 'Real Casper Testnet Transactions', color: 'text-cyan-400' },
  { value: '32,000+', label: 'Settlements Executed',            color: 'text-green-400' },
  { value: '112',     label: 'Active Currency Pairs',           color: 'text-purple-400' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col font-mono">
      {/* Nav */}
      <nav className="shrink-0 h-14 border-b border-zinc-900 flex items-center px-8">
        <span className="text-sm font-bold text-zinc-100 tracking-tight">ALPHXC</span>
        <span className="ml-3 text-xs text-zinc-600 hidden sm:block">Autonomous FX Settlement</span>
        <div className="ml-auto flex items-center gap-4">
          <a
            href="https://testnet.cspr.live"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Casper Testnet
          </a>
          <button
            onClick={() => navigate('/app')}
            className="px-4 py-1.5 text-xs rounded-md bg-cyan-700 hover:bg-cyan-600 text-white transition-colors font-semibold"
          >
            Launch App →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-xs text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live on Casper Testnet · Agentic Buildathon 2026
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-100 max-w-4xl leading-tight mb-6">
          Automated, Institutional
          <br />
          <span className="text-cyan-400">Cross-Border Settlement</span>
          <br />
          <span className="text-zinc-300">Engine Powered by AI and Casper</span>
        </h1>

        <p className="text-zinc-400 max-w-2xl text-sm md:text-base leading-relaxed mb-12">
          ALPHXC monitors 400+ FX pairs in real time, identifies settlement opportunities,
          and executes autonomously on Casper Network — no human in the loop.
        </p>

        {/* Live stats */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          {STATS.map(s => (
            <div
              key={s.label}
              className="px-6 py-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors"
            >
              <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
              <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/app')}
          className="px-10 py-3.5 rounded-lg text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-xl shadow-cyan-900/30"
        >
          Launch App →
        </button>
      </section>

      {/* Feature columns */}
      <section className="border-t border-zinc-900 px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/20 hover:border-zinc-700 transition-colors"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-sm font-bold text-zinc-100 mb-2">{f.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 px-6 py-5 text-center">
        <p className="text-xs text-zinc-700">Built on Casper Network · Casper Agentic Buildathon 2026</p>
      </footer>
    </div>
  )
}
