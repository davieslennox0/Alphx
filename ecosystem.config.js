module.exports = {
  apps: [
    {
      name: 'alphx-api',
      script: 'python3',
      args: '-m uvicorn backend.main:app --host 0.0.0.0 --port 8400',
      cwd: '/root/alphx',
      env: { PYTHONPATH: '/root/alphx' },
    },
    {
      name: 'alphx-yahoo',
      script: 'backend/agents/yahoo_agent.py',
      interpreter: 'python3',
      cwd: '/root/alphx',
      env: { PYTHONPATH: '/root/alphx' },
    },
    {
      name: 'alphx-twelvedata',
      script: 'backend/agents/twelvedata_agent.py',
      interpreter: 'python3',
      cwd: '/root/alphx',
      env: { PYTHONPATH: '/root/alphx' },
    },
    {
      name: 'alphx-aggregator',
      script: 'backend/agents/aggregator_agent.py',
      interpreter: 'python3',
      cwd: '/root/alphx',
      env: { PYTHONPATH: '/root/alphx' },
    },
  ],
}
