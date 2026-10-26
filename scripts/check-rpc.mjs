const rpc = process.env.MEZO_TESTNET_RPC || 'https://rpc.test.mezo.org';
const response = await fetch(rpc, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
  signal: AbortSignal.timeout(10000)
});
if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
const result = await response.json();
if (result.result !== '0x7b7b') throw new Error(`Expected Mezo testnet 31611; got ${result.result || JSON.stringify(result.error)}`);
console.log(`Mezo testnet RPC confirmed: chain ${parseInt(result.result, 16)} (${rpc})`);
