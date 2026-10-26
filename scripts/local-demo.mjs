// Disposable Anvil-only scenario. Uses Anvil's unlocked accounts and time travel.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPublicClient, createWalletClient, defineChain, http, parseUnits } from 'viem';

const rpc = 'http://127.0.0.1:8545';
const chain = defineChain({ id: 31337, name: 'Anvil', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
const publicClient = createPublicClient({ chain, transport: http(rpc) });
assert.equal(await publicClient.getChainId(), 31337, 'local Anvil only');
const accounts = await publicClient.request({ method: 'eth_accounts' });
const [admin, alice, operator, bob, carol] = accounts;
assert.ok(carol, 'Anvil needs five unlocked test accounts');
const wallet = account => createWalletClient({ account, chain, transport: http(rpc) });
const broadcast = JSON.parse(await readFile('broadcast/Deploy.s.sol/31337/run-latest.json', 'utf8'));
const addressOf = name => {
  const address = broadcast.transactions.find(tx => tx.contractName === name && tx.transactionType === 'CREATE')?.contractAddress;
  assert.ok(address, `missing local deployment ${name}`);
  return address;
};
const token = addressOf('EpochDemoUSD');
const nft = addressOf('MockVeBTC');
const claim = addressOf('EpochClaim');
const source = addressOf('MockRewardSource');
const market = addressOf('EpochMarket');
const abis = JSON.parse(await readFile('lib/abis.json', 'utf8'));
const txs = {};
async function write(label, account, address, abi, functionName, args) {
  const hash = await wallet(account).writeContract({ address, abi, functionName, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, 'success', `${label} reverted`);
  txs[label] = hash;
}
async function read(address, abi, functionName, args = []) {
  return publicClient.readContract({ address, abi, functionName, args });
}

const unit = parseUnits('1', 18);
await write('mintBuyerTokens', admin, token, abis.EpochDemoUSD, 'mint', [bob, 8n * unit]);
await write('mintOperatorTokens', admin, token, abis.EpochDemoUSD, 'mint', [operator, 12n * unit]);
const block = await publicClient.getBlock();
const start = BigInt(block.timestamp) + 120n;
const end = start + 120n;
const unlock = end + 60n;
await write('mintMockPosition', admin, nft, abis.MockVeBTC, 'mint', [alice, unlock]);
await write('approvePosition', alice, nft, abis.MockVeBTC, 'approve', [market, 1n]);
await write('createOffer', alice, market, abis.EpochMarket, 'createOffer', [1n, start, end, 8n * unit]);
assert.equal((await read(nft, abis.MockVeBTC, 'ownerOf', [1n])).toLowerCase(), market.toLowerCase());
await write('approvePrice', bob, token, abis.EpochDemoUSD, 'approve', [market, 8n * unit]);
await write('buyClaim', bob, market, abis.EpochMarket, 'buyOffer', [1n]);
assert.equal((await read(claim, abis.EpochClaim, 'ownerOf', [1n])).toLowerCase(), bob.toLowerCase());
await write('transferClaim', bob, claim, abis.EpochClaim, 'safeTransferFrom', [bob, carol, 1n]);
await write('approveReward', operator, token, abis.EpochDemoUSD, 'approve', [source, 12n * unit]);
await write('fundMockReward', operator, source, abis.MockRewardSource, 'fundOffer', [1n, 12n * unit]);
await publicClient.request({ method: 'evm_increaseTime', params: [300] });
await publicClient.request({ method: 'evm_mine' });
await write('finalize', alice, market, abis.EpochMarket, 'finalizeOffer', [1n]);
await write('redeem', carol, market, abis.EpochMarket, 'redeem', [1n]);
await publicClient.request({ method: 'evm_increaseTime', params: [120] });
await publicClient.request({ method: 'evm_mine' });
await write('returnPrincipal', alice, market, abis.EpochMarket, 'withdrawPrincipal', [1n]);
assert.equal((await read(nft, abis.MockVeBTC, 'ownerOf', [1n])).toLowerCase(), alice.toLowerCase());
assert.equal(await read(token, abis.EpochDemoUSD, 'balanceOf', [alice]), 8n * unit);
assert.equal(await read(token, abis.EpochDemoUSD, 'balanceOf', [carol]), 12n * unit);
const offer = await read(market, abis.EpochMarket, 'getOffer', [1n]);
assert.equal(Number(offer.status), 6, 'offer must be CLOSED');
console.log(JSON.stringify({ network: 'LOCAL ANVIL ONLY', mode: 'DEMO ERC-20 - NOT MUSD', addresses: { token, nft, claim, source, market }, txs, result: 'closed; Alice has original mock NFT and 8 demo tokens; Carol has 12 demo tokens' }, null, 2));
