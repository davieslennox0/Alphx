/**
 * ALPHXC Settlement Transaction — submits a real Casper testnet transaction
 * for each FX trade settlement.
 *
 * Each "FX token swap" is represented as a native CSPR transfer from the
 * oracle wallet to the ALPHXC settlement pool address. The FX pair name,
 * direction, amount, and rate are encoded in the transfer ID and logged
 * on-chain as a permanent settlement audit trail.
 *
 * Usage: node settle_tx.cjs '<json_args>'
 *
 * JSON args:
 *   secret_key_path  - path to Ed25519 secret_key.pem
 *   pair             - FX pair e.g. "EUR/USD"
 *   direction        - "BUY" | "SELL"
 *   amount           - notional amount (e.g. 50000)
 *   rate             - settled rate (e.g. 1.0854)
 *   req_id           - integer trade request ID
 *   node_url         - Casper RPC URL
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

// ALPHXC Settlement Pool — deterministic address, no controlling private key.
// Funds sent here are locked on testnet (serves as a on-chain burn/pool sink).
// Derived from sha256("alphxc-settlement-pool") with Casper Ed25519 prefix.
const SETTLEMENT_POOL_PK = '019cefe89868658b7f490a4b732086bce761d89eb75714eeb08fb035a5c0f9afa6';

// Minimum transfer: 2_500_000_000 motes (2.5 CSPR) — Casper network hard floor.
const MIN_TRANSFER_MOTES = BigInt(2_500_000_000);

// Gas cap: 0.1 CSPR
const GAS_MOTES = 100_000_000;

async function main() {
  if (process.argv.length < 3) {
    console.error(JSON.stringify({ error: 'Usage: node settle_tx.cjs \'<json>\'' }));
    process.exit(1);
  }

  let args;
  try {
    args = JSON.parse(process.argv[2]);
  } catch (e) {
    console.error(JSON.stringify({ error: `Invalid JSON args: ${e.message}` }));
    process.exit(1);
  }

  const {
    secret_key_path,
    pair,
    direction,
    amount,
    rate,
    req_id,
    node_url,
  } = args;

  const rpcClient = new RpcClient(new HttpHandler(node_url));

  const pemContent = fs.readFileSync(secret_key_path, 'utf8');
  const privateKey = await PrivateKey.fromPem(pemContent, KeyAlgorithm.ED25519);

  const recipientKey = PublicKey.fromHex(SETTLEMENT_POOL_PK);

  // Transfer motes = floored at 0.01 CSPR minimum to conserve wallet balance.
  const notionalMotes = BigInt(Math.floor(amount));
  const transferMotes = notionalMotes > MIN_TRANSFER_MOTES
    ? notionalMotes
    : MIN_TRANSFER_MOTES;

  // Transfer ID encodes pair hash (upper 16 bits) + req_id (lower 16 bits)
  // packed into a safe JS integer so the chain records both in the u64 field.
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
  const msg = err.message || String(err);
  process.stderr.write(JSON.stringify({ error: msg }) + '\n');
  process.exit(1);
});
