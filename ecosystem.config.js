module.exports = {
  apps: [
    {
      name: 'alphxc-api',
      script: 'python3',
      args: '-m uvicorn backend.main:app --host 0.0.0.0 --port 8400',
      cwd: '/root/alphx',
      env: { PYTHONPATH: '/root/alphx' },
    },
    {
      name: 'alphxc-yahoo',
      script: 'backend/agents/yahoo_agent.py',
      interpreter: 'python3',
      cwd: '/root/alphx',
      env: { PYTHONPATH: '/root/alphx' },
    },
    {
      name: 'alphxc-twelvedata',
      script: 'backend/agents/twelvedata_agent.py',
      interpreter: 'python3',
      cwd: '/root/alphx',
      env: { PYTHONPATH: '/root/alphx' },
    },
    {
      name: 'alphxc-aggregator',
      script: 'backend/agents/aggregator_agent.py',
      interpreter: 'python3',
      cwd: '/root/alphx',
      env: { PYTHONPATH: '/root/alphx' },
    },
  ],
}
