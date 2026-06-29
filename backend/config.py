import os
from dotenv import load_dotenv

load_dotenv()

TWELVE_DATA_API_KEY = os.getenv("TWELVE_DATA_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
CSPR_CLOUD_API_KEY = os.getenv("CSPR_CLOUD_API_KEY", "")
ORACLE_WALLET_SECRET_KEY = os.getenv("ORACLE_WALLET_SECRET_KEY", "")
ORACLE_WALLET_PUBLIC_KEY = os.getenv("ORACLE_WALLET_PUBLIC_KEY", "")
ORACLE_CONTRACT_HASH = os.getenv("ORACLE_CONTRACT_HASH", "")
CASPER_NODE_URL = os.getenv("CASPER_NODE_URL", "https://rpc.testnet.casperlabs.io")
CSPR_CLOUD_BASE_URL = os.getenv("CSPR_CLOUD_BASE_URL", "https://api.cspr.cloud")
CSPR_TRADE_MCP_URL = os.getenv("CSPR_TRADE_MCP_URL", "")
PORT = int(os.getenv("PORT", "8400"))
DB_PATH = os.getenv("DB_PATH", "/root/alphx/alphx.db")
