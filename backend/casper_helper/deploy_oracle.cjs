/**
 * Deploy FXOracle contract to Casper testnet.
 * Uses SessionBuilder.installOrUpgrade() to create a persistent contract entity.
 * Outputs the contract hash from execution effects.
 */
'use strict';

const {
  SessionBuilder,
  PrivateKey,
  KeyAlgorithm,
  RpcClient,
  HttpHandler,
} = require('casper-js-sdk');
const fs = require('fs');
const path = require('path');

const NODE_URL   = process.env.CASPER_NODE_URL || 'https://node.testnet.casper.network/rpc';
const KEY_PATH   = process.env.KEY_PATH || '/root/alphx/wallet/agents/trader_a_secret_key.pem';
const WASM_PATH  = process.env.WASM_PATH || '/root/alphx/contract/wasm/FXOracle_install.wasm';
const CHAIN_NAME = 'casper-test';

async function main() {
  const pem  = fs.readFileSync(KEY_PATH, 'utf8');
  const key  = await PrivateKey.fromPem(pem, KeyAlgorithm.ED25519);
  const wasm = fs.readFileSync(WASM_PATH);

  const { Args } = require('casper-js-sdk');
  const tx = new SessionBuilder()
    .wasm(wasm)
    .installOrUpgrade()
    .runtimeArgs(new Args(new Map()))
    .from(key.publicKey)
    .chainName(CHAIN_NAME)
    .payment(50_000_000_000)  // 50 CSPR gas cap
    .build();

  await tx.sign(key);

  const rpcClient = new RpcClient(new HttpHandler(NODE_URL));
  const result = await rpcClient.putTransaction(tx);
  const txHash = result.rawJSON?.transaction_hash?.Version1
               || result.rawJSON?.transaction_hash
               || JSON.stringify(result.rawJSON);

  console.error(`TX submitted: ${txHash}`);
  console.error('Waiting 30s for finality...');
  await new Promise(r => setTimeout(r, 30000));

  // Query the transaction to find the contract hash in execution effects
  let txResult;
  try {
    txResult = await rpcClient.getTransactionByTransactionHash(
      { Version1: txHash },
      false
    );
  } catch (e) {
    console.error('getTransaction error:', e.message);
    // Try raw RPC
    const http = require('https');
    txResult = await new Promise((resolve, reject) => {
      const body = JSON.stringify({
        jsonrpc: '2.0', method: 'info_get_transaction',
        params: { transaction_hash: { Version1: txHash }, finalized_approvals: false },
        id: 1
      });
      const req = http.request('https://node.testnet.casper.network/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d)));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  const raw = JSON.stringify(txResult, null, 2);

  // Search for contract-related hashes in the effects
  const contractMatches = raw.match(/hash-[a-f0-9]{64}/g) || [];
  const packageMatches  = raw.match(/"contract_package_hash"\s*:\s*"([^"]+)"/g) || [];
  const entityMatches   = raw.match(/entity-contract-[a-f0-9]{64}/g) || [];

  console.error('Contract package hashes:', packageMatches);
  console.error('Hash- keys found:', contractMatches);
  console.error('Entity keys found:', entityMatches);

  // Check error
  const errMsg = raw.match(/"error_message"\s*:\s*"([^"]+)"/);
  if (errMsg) {
    console.error('Execution error:', errMsg[1]);
    process.exit(1);
  }

  const hash = contractMatches[0] || entityMatches[0] || packageMatches[0] || '';
  console.log(JSON.stringify({ tx_hash: txHash, contract_hash: hash, raw_snippet: raw.slice(0, 800) }));
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
