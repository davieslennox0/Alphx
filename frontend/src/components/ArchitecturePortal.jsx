import { useState } from 'react'

const FLOW = [
  { id: 'data',     label: 'Data Sources',          desc: 'Yahoo Finance + Twelve Data',           icon: '📡', color: 'border-blue-700 text-blue-300' },
  { id: 'agg',      label: 'FX Aggregator Agent',   desc: 'Merges + normalises 112+ pairs',        icon: '🔄', color: 'border-purple-700 text-purple-300' },
  { id: 'groq',     label: 'Groq AI Decision',      desc: 'llama-3.1-8b · 14,400 RPD',            icon: '🤖', color: 'border-green-700 text-green-300' },
  { id: 'casper',   label: 'Casper Network',         desc: 'Native transfer · ~8s finality',       icon: '⛓', color: 'border-red-700 text-red-300' },
  { id: 'settle',   label: 'CSPR.trade Settlement',  desc: 'Agent wallets rotate CSPR pool',       icon: '✅', color: 'border-cyan-700 text-cyan-300' },
]

const SNIPPETS = [
  {
    title:    'Get live rate',
    lang:     'bash',
    code: `curl -H "X-PAYMENT-SIGNATURE: {cspr_tx_hash}" \\
  https://alphxc.duckdns.org/fx/rate/USD/NGN`,
  },
  {
    title:    'Get all pairs',
    lang:     'bash',
    code: `curl https://alphxc.duckdns.org/fx/pairs`,
  },
  {
    title:    'Batch rates',
    lang:     'bash',
    code: `curl -H "X-PAYMENT-SIGNATURE: {cspr_tx_hash}" \\
  "https://alphxc.duckdns.org/fx/rates/batch?pairs=EUR/USD,GBP/USD,USD/NGN"`,
  },
]

function CodeBlock({ snippet }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(snippet.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs text-zinc-400 font-semibold">{snippet.title}</span>
        <button
          onClick={copy}
          className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 text-xs font-mono text-green-400 bg-[#0a0a0a] overflow-x-auto whitespace-pre">
        {snippet.code}
      </pre>
    </div>
  )
}

export default function ArchitecturePortal({ onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#111113] border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-[#111113] flex items-center justify-between px-5 py-3 border-b border-zinc-800 z-10">
            <h2 className="text-sm font-bold text-zinc-100">Architecture & Developer Portal</h2>
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 text-xl leading-none">×</button>
          </div>

          <div className="p-5 space-y-6">
            {/* Flow diagram */}
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">System Flow</h3>
              <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
                {FLOW.map((node, i) => (
                  <div key={node.id} className="flex items-center shrink-0">
                    <div className={`px-3 py-2.5 rounded-lg border ${node.color} bg-zinc-900/40 min-w-[110px]`}>
                      <div className="text-lg mb-1">{node.icon}</div>
                      <div className={`text-xs font-semibold ${node.color.split(' ')[1]}`}>{node.label}</div>
                      <div className="text-xs text-zinc-600 mt-0.5 leading-tight">{node.desc}</div>
                    </div>
                    {i < FLOW.length - 1 && (
                      <div className="flex items-center shrink-0 px-1">
                        <svg width="32" height="12" viewBox="0 0 32 12">
                          <line
                            x1="0" y1="6" x2="24" y2="6"
                            stroke="#3f3f46"
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                            className="animate-dash"
                          />
                          <polygon points="24,2 32,6 24,10" fill="#3f3f46" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* API Reference */}
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">API Reference</h3>
              <p className="text-xs text-zinc-600 mb-3">
                Integrate ALPHXC FX data into your agent in 60 seconds
              </p>
              <div className="space-y-3">
                {SNIPPETS.map(s => <CodeBlock key={s.title} snippet={s} />)}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 text-center">
              <a
                href="https://testnet.cspr.live"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View live transactions on cspr.live ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
