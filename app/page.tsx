'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPublicClient, formatUnits, http, parseUnits, type Abi } from 'viem';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWriteContract } from 'wagmi';
import Image from 'next/image';
import abis from '../lib/abis.json';
import emblem from '../Epoch Fintech Emblem.png';
import { addresses, economicMode, mezoTestnet } from '../lib/chain';

const client = createPublicClient({ chain: mezoTestnet, transport: http() });
const marketAbi = abis.EpochMarket as Abi;
const claimAbi = abis.EpochClaim as Abi;
const nftAbi = abis.MockVeBTC as Abi;
const sourceAbi = abis.MockRewardSource as Abi;
const tokenAbi = abis.EpochDemoUSD as Abi;
const statusNames = ['NONE', 'LISTED', 'CANCELLED', 'SOLD', 'SETTLED', 'REDEEMED', 'CLOSED'];
type Offer = { seller: `0x${string}`; sourceTokenId: bigint; price: bigint; epochStart: bigint; epochEnd: bigint; principalUnlock: bigint; claimId: bigint; realizedReward: bigint; status: number };
type OfferView = { id: bigint; data: Offer; claimOwner?: `0x${string}`; funded: bigint };

function short(address?: string) { return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '—'; }
function date(seconds: bigint) { return new Date(Number(seconds) * 1000).toLocaleString(); }
function link(address?: string) { return address ? `${mezoTestnet.blockExplorers.default.url}/address/${address}` : '#'; }

export default function Home() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [offers, setOffers] = useState<OfferView[]>([]);
  const [btc, setBtc] = useState<bigint>(0n);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [decimals, setDecimals] = useState(18);
  const [operator, setOperator] = useState<string>();
  const [minter, setMinter] = useState<string>();
  const [message, setMessage] = useState('Read-only offer data is available without connecting a wallet.');
  const [tx, setTx] = useState<string>();
  const [positionId, setPositionId] = useState('1');
  const [price, setPrice] = useState('8');
  const [reward, setReward] = useState('12');
  const [recipient, setRecipient] = useState('');
  const configured = Boolean(addresses.market && addresses.claim && addresses.position && addresses.source && addresses.token);
  const correctChain = chainId === mezoTestnet.id;

  const refresh = useCallback(async () => {
    if (!configured) return;
    try {
      const [next, d, op, owner] = await Promise.all([
        client.readContract({ address: addresses.market!, abi: marketAbi, functionName: 'nextOfferId' }) as Promise<bigint>,
        client.readContract({ address: addresses.token!, abi: tokenAbi, functionName: 'decimals' }) as Promise<number>,
        client.readContract({ address: addresses.source!, abi: sourceAbi, functionName: 'operator' }) as Promise<string>,
        client.readContract({ address: addresses.position!, abi: nftAbi, functionName: 'owner' }) as Promise<string>,
      ]);
      setDecimals(Number(d)); setOperator(op); setMinter(owner);
      const ids = Array.from({ length: Math.min(Number(next - 1n), 30) }, (_, i) => next - BigInt(i) - 1n);
      const list = await Promise.all(ids.map(async id => {
        const data = await client.readContract({ address: addresses.market!, abi: marketAbi, functionName: 'getOffer', args: [id] }) as Offer;
        const funded = await client.readContract({ address: addresses.source!, abi: sourceAbi, functionName: 'fundedAmount', args: [id] }) as bigint;
        let claimOwner: `0x${string}` | undefined;
        if (data.status === 3 || data.status === 4) {
          try { claimOwner = await client.readContract({ address: addresses.claim!, abi: claimAbi, functionName: 'ownerOf', args: [data.claimId] }) as `0x${string}`; } catch { /* redeemed or unavailable */ }
        }
        return { id, data, funded, claimOwner };
      }));
      setOffers(list);
      if (address) {
        const [native, balance] = await Promise.all([
          client.getBalance({ address }),
          client.readContract({ address: addresses.token!, abi: tokenAbi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
        ]);
        setBtc(native); setTokenBalance(balance);
      }
    } catch (error) { setMessage(`Chain read failed: ${error instanceof Error ? error.message : String(error)}`); }
  }, [address, configured]);

  useEffect(() => { refresh(); const timer = setInterval(refresh, 10000); return () => clearInterval(timer); }, [refresh]);

  async function send(address_: `0x${string}`, abi: Abi, functionName: string, args: unknown[], label: string) {
    if (!correctChain) { setMessage('Switch your wallet to Mezo testnet first.'); return; }
    try {
      setTx(undefined); setMessage(`Confirm ${label} in your wallet…`);
      const hash = await writeContractAsync({ address: address_, abi, functionName, args, chainId: mezoTestnet.id });
      setTx(hash); setMessage(`${label}: waiting for testnet confirmation…`);
      const receipt = await client.waitForTransactionReceipt({ hash });
      setMessage(receipt.status === 'success' ? `${label} confirmed.` : `${label} reverted.`);
      await refresh();
    } catch (error) { setMessage(`${label} failed: ${error instanceof Error ? error.message : String(error)}`); }
  }

  async function createOffer() {
    const id = BigInt(positionId);
    const now = BigInt(Math.floor(Date.now() / 1000));
    await send(addresses.market!, marketAbi, 'createOffer', [id, now + 120n, now + 240n, parseUnits(price, decimals)], 'Create simulated offer');
  }
  const asset = economicMode === 'DEMO_ERC20' ? 'DEMO-USD (NOT MUSD)' : economicMode === 'REAL_TESTNET_MEZO' ? 'testnet MEZO' : 'testnet MUSD';
  const canWrite = Boolean(isConnected && correctChain && configured);

  return <main>
    <div className="top"><div className="logo">EPOCH<span style={{ color: '#b7e68b' }}> / LITE</span></div><div><span className="tag">MEZO TESTNET · 31611</span><span className="tag warn">SIMULATED POSITION & REWARDS</span><span className="tag">{asset}</span></div></div>
    <section className="hero"><div className="hero-layout"><div><div className="eyebrow">A PROOF OF FUTURE FEE RIGHTS</div><h1>Sell future Bitcoin revenue without selling the principal.</h1><p>Epoch Lite tests the separation of principal and one future reward claim. The position and reward source are simulated; payment and redemption use onchain test tokens.</p></div><Image className="emblem" src={emblem} alt="Epoch emblem" priority /></div><div className="steps"><div className="step"><strong>01 / Escrow</strong><p>Seller deposits a mock position NFT.</p></div><div className="step"><strong>02 / Buy</strong><p>Buyer pays for a transferable claim.</p></div><div className="step"><strong>03 / Redeem</strong><p>Current claim holder receives the amount actually funded.</p></div></div></section>
    {!configured && <div className="card risk"><h2>Contracts are not deployed</h2><p>Set the five <code>NEXT_PUBLIC_…_ADDRESS</code> variables after a verified Mezo testnet deployment. The interface will then read live contract state.</p></div>}
    <div className="grid"><section className="card"><h2>Wallet</h2>{!isConnected ? <button onClick={() => connect({ connector: connectors[0] })}>Connect EVM wallet</button> : <><p>{short(address)} · {correctChain ? 'Mezo testnet' : `wrong chain ${chainId}`}</p>{!correctChain && <button onClick={() => switchChain({ chainId: mezoTestnet.id })}>Switch to Mezo testnet</button>}<button className="secondary" onClick={() => disconnect()}>Disconnect</button><p>BTC gas: {formatUnits(btc, 18)} · {asset}: {formatUnits(tokenBalance, decimals)}</p></>}<p className="muted">Each write opens a wallet confirmation. No key is stored here.</p></section>
    <section className="card"><h2>Deployment</h2><dl><dt>Market</dt><dd><a href={link(addresses.market)} target="_blank">{short(addresses.market)}</a></dd><dt>Claim NFT</dt><dd><a href={link(addresses.claim)} target="_blank">{short(addresses.claim)}</a></dd><dt>Mock position</dt><dd><a href={link(addresses.position)} target="_blank">{short(addresses.position)}</a></dd><dt>Mock source</dt><dd><a href={link(addresses.source)} target="_blank">{short(addresses.source)}</a></dd><dt>Payment token</dt><dd><a href={link(addresses.token)} target="_blank">{short(addresses.token)}</a></dd></dl></section></div>
    <div className="status" role="status" aria-live="polite">{message}{tx && <> <a href={`${mezoTestnet.blockExplorers.default.url}/tx/${tx}`} target="_blank">View transaction ↗</a></>}</div>
    <div className="grid"><section className="card"><h2>Seller · mock position</h2><p className="risk">SIMULATED POSITION: illustrative 0.10 BTC. No BTC is escrowed.</p><p>Designated minter: <code>{short(minter)}</code></p><button disabled={!canWrite || address?.toLowerCase() !== minter?.toLowerCase()} onClick={() => send(addresses.position!, nftAbi, 'mint', [address!, BigInt(Math.floor(Date.now() / 1000) + 600)], 'Mint mock position')}>Mint mock position</button><label className="field">Position token ID<input value={positionId} onChange={e => setPositionId(e.target.value)} inputMode="numeric" /></label><label className="field">Ask price in {asset}<input value={price} onChange={e => setPrice(e.target.value)} inputMode="decimal" /></label><p className="muted">New offer opens 2 minutes from creation and ends 2 minutes later. Minted mock positions unlock after 10 minutes.</p><button disabled={!canWrite} onClick={() => send(addresses.position!, nftAbi, 'approve', [addresses.market!, BigInt(positionId)], 'Approve mock position')}>Approve NFT</button><button disabled={!canWrite} onClick={createOffer}>Create offer</button></section>
    <section className="card"><h2>Mock reward operator</h2><p className="risk">Operator funds rewards from its own test-token balance. These are not Mezo fees.</p><p>Operator: <code>{short(operator)}</code></p><label className="field">Reward amount in {asset}<input value={reward} onChange={e => setReward(e.target.value)} inputMode="decimal" /></label><p className="muted">Choose an offer below, then approve the source and fund it before finalization.</p></section></div>
    <section className="card"><h2>Onchain offers</h2><p className="muted">Read-only data refreshes every 10 seconds. SIMULATED 2-MINUTE EPOCH. Reward can be zero; the buyer never owns principal.</p><div className="offers">{offers.length === 0 && <p>No offers on this deployment yet.</p>}{offers.map(({ id, data, claimOwner, funded }) => <article className="offer" key={id.toString()}><div className="inline"><h3>Offer #{id.toString()}</h3><span className="tag">{statusNames[data.status] || 'UNKNOWN'}</span><span className="tag warn">SIMULATED</span></div><p>Mock position #{data.sourceTokenId.toString()} · seller <code>{short(data.seller)}</code> · price <strong>{formatUnits(data.price, decimals)} {asset}</strong></p><p>Epoch: {date(data.epochStart)} → {date(data.epochEnd)} · principal unlock: {date(data.principalUnlock)}</p><p>Claim owner: <code>{short(claimOwner)}</code> · funded: {formatUnits(funded, decimals)} · settled: {formatUnits(data.realizedReward, decimals)} {asset}</p><div className="inline"><button disabled={!canWrite || data.status !== 1} onClick={() => send(addresses.token!, tokenAbi, 'approve', [addresses.market!, data.price], 'Approve payment')}>Approve {asset}</button><button disabled={!canWrite || data.status !== 1} onClick={() => send(addresses.market!, marketAbi, 'buyOffer', [id], 'Buy claim')}>Buy claim</button><button disabled={!canWrite || data.status !== 1 || address?.toLowerCase() !== data.seller.toLowerCase()} className="secondary" onClick={() => send(addresses.market!, marketAbi, 'cancelOffer', [id], 'Cancel listing')}>Cancel</button></div><div className="inline"><button disabled={!canWrite || address?.toLowerCase() !== operator?.toLowerCase() || data.status !== 3} className="secondary" onClick={() => send(addresses.token!, tokenAbi, 'approve', [addresses.source!, parseUnits(reward, decimals)], 'Approve mock funding')}>Approve reward</button><button disabled={!canWrite || address?.toLowerCase() !== operator?.toLowerCase() || data.status !== 3} className="secondary" onClick={() => send(addresses.source!, sourceAbi, 'fundOffer', [id, parseUnits(reward, decimals)], 'Fund mock reward')}>Fund reward</button><button disabled={!canWrite || data.status !== 3 || BigInt(Math.floor(Date.now() / 1000)) < data.epochEnd} onClick={() => send(addresses.market!, marketAbi, 'finalizeOffer', [id], 'Finalize epoch')}>Finalize</button></div><div className="inline"><button disabled={!canWrite || data.status !== 4 || address?.toLowerCase() !== claimOwner?.toLowerCase()} onClick={() => send(addresses.market!, marketAbi, 'redeem', [id], 'Redeem reward')}>Redeem reward</button><button disabled={!canWrite || (data.status !== 2 && data.status !== 5) || address?.toLowerCase() !== data.seller.toLowerCase() || BigInt(Math.floor(Date.now() / 1000)) < data.principalUnlock} onClick={() => send(addresses.market!, marketAbi, 'withdrawPrincipal', [id], 'Return mock principal NFT')}>Withdraw original NFT</button></div>{(data.status === 3 || data.status === 4) && <div className="inline"><input aria-label="Claim transfer recipient" placeholder="Claim recipient 0x…" value={recipient} onChange={e => setRecipient(e.target.value)} /><button disabled={!canWrite || address?.toLowerCase() !== claimOwner?.toLowerCase() || !/^0x[a-fA-F0-9]{40}$/.test(recipient)} className="secondary" onClick={() => send(addresses.claim!, claimAbi, 'safeTransferFrom', [address!, recipient, data.claimId], 'Transfer claim')}>Transfer claim NFT</button></div>}</article>)}</div></section>
    <footer className="foot">Epoch Lite is a testnet proof. The mock source controls the payout; no live veBTC NFT, actual BTC, or Mezo fee distribution is integrated. Sample prices and rewards are demonstration values, not forecasts.</footer>
  </main>;
}
