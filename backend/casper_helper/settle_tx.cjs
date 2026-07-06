/**
 * ALPHXC Settlement Transaction
 *
 * Submits a real Casper testnet CSPR transfer between agent wallets.
 * The sender is the requesting agent; the recipient rotates to another agent.
 * CSPR stays within the agent pool rather than being burned.
 *
 * Usage: node settle_tx.cjs '<json_args>'
 *
 * JSON args:
 *   sender_key_path      - path to sender's Ed25519 secret_key.pem
 *   recipient_public_key - hex public key of recipient agent
 *   pair                 - FX pair e.g. "EUR/USD"
 *   direction            - "BUY" | "SELL"
 *   amount               - notional amount (e.g. 50000)
 *   rate                 - settled rate (e.g. 1.0854)
 *   req_id               - integer trade request ID
 *   node_url             - Casper RPC URL
 *
 * Outputs JSON: { tx_hash, pair, direction, amount, rate, req_id }
 * On error:     { error: "<message>" }
 */

'use strict';

const {
  NativeTransferBuilder,
  PrivateKey,
  KeyAlgorithm,
  PublicKey,
  RpcClient,
  HttpHandler,
} = require('casper-js-sdk');
const fs = require('fs');

// Minimum transfer: 2_500_000_000 motes (2.5 CSPR) — Casper network hard floor.
const MIN_TRANSFER_MOTES = BigInt(2_500_000_000);

// Gas cap: 0.1 CSPR
const GAS_MOTES = 100_000_000;

async function main() {
  if (process.argv.length < 3) {
    process.stderr.write(JSON.stringify({ error: 'Usage: node settle_tx.cjs \'<json>\'' }) + '\n');
    process.exit(1);
  }

  let args;
  try {
    args = JSON.parse(process.argv[2]);
  } catch (e) {
    process.stderr.write(JSON.stringify({ error: `Invalid JSON args: ${e.message}` }) + '\n');
    process.exit(1);
  }

  const {
    sender_key_path,
    recipient_public_key,
    pair,
    direction,
    amount,
    rate,
    req_id,
    node_url,
  } = args;

  const rpcClient = new RpcClient(new HttpHandler(node_url));

  const pemContent = fs.readFileSync(sender_key_path, 'utf8');
  const privateKey = await PrivateKey.fromPem(pemContent, KeyAlgorithm.ED25519);
  const recipientKey = PublicKey.fromHex(recipient_public_key);

  // Floor at network minimum
  const notionalMotes = BigInt(Math.floor(amount));
  const transferMotes = notionalMotes > MIN_TRANSFER_MOTES ? notionalMotes : MIN_TRANSFER_MOTES;

  // Transfer ID encodes pair hash (upper 16 bits) + req_id (lower 16 bits)
  const pairHash = Array.from(Buffer.from(pair)).reduce((a, b) => (a * 31 + b) & 0xffff, 0);
  const transferId = (pairHash * 65536 + (req_id & 0xffff)) & 0x7fffffff;

  const transaction = new NativeTransferBuilder()
    .from(privateKey.publicKey)
    .target(recipientKey)
    .amount(transferMotes.toString())
    .id(transferId)
    .chainName('casper-test')
    .payment(GAS_MOTES)
    .build();

  transaction.sign(privateKey);

  const result = await rpcClient.putTransaction(transaction);
  const hash = result.rawJSON?.transaction_hash?.Version1 || '';

  console.log(JSON.stringify({
    tx_hash: hash,
    pair,
    direction,
    amount,
    rate,
    req_id,
    transfer_motes: transferMotes.toString(),
    transfer_id: transferId,
  }));
}

main().catch(err => {
  process.stderr.write(JSON.stringify({ error: err.message || String(err) }) + '\n');
  process.exit(1);
});
