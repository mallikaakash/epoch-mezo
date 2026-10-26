'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPublicClient, http, isAddress, type Abi, type Hex } from 'viem';
import { useAccount, useConnect, useSwitchChain, useWalletClient } from 'wagmi';
import artifacts from '../../lib/deploy-artifacts.json';
import { mezoTestnet } from '../../lib/chain';

const publicClient = createPublicClient({ chain: mezoTestnet, transport: http() });
const mezo = '0x7B7c000000000000000000000000000000000001';
const musd = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503';
type ContractName = 'MockVeBTC' | 'EpochClaim' | 'MockRewardSource' | 'EpochMarket';
type State = { chainId: number; deployer: string; token: string; operator: string; addresses: { position?: `0x${string}`; claim?: `0x${string}`; source?: `0x${string}`; market?: `0x${string}`; token?: `0x${string}` }; claimWired?: boolean; sourceWired?: boolean; hashes: string[] };
const key = 'epoch-lite-deployment-v1';

export default function DeployPage() {
  const { address, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  const { data: wallet } = useWalletClient();
  const [token, setToken] = useState<string>(mezo);
  const [operator, setOperator] = useState('');
  const [state, setState] = useState<State>();
  const [message, setMessage] = useState('Connect the funded Mezo testnet wallet to deploy. Each step requires its own MetaMask approval.');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) || 'null') as State | null; if (saved?.chainId === mezoTestnet.id) { setState(saved); setToken(saved.token); setOperator(saved.operator); } } catch { /* ignore corrupt local data */ }
  }, []);
  function save(next: State) { localStorage.setItem(key, JSON.stringify(next)); setState(next); }
  const selected = state?.token || token;
  const admin = state?.deployer || address;
  const op = state?.operator || operator || address;
  const ready = Boolean(address && wallet && chainId === mezoTestnet.id && (!state || address.toLowerCase() === state.deployer.toLowerCase()));

  async function transact(label: string, run: () => Promise<Hex>) {
    setBusy(true);
    try {
      setMessage(`Confirm ${label} in MetaMask…`);
      const hash = await run();
      setMessage(`${label} sent: ${hash}. Waiting for Mezo testnet confirmation…`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error(`${label} reverted. Transaction: ${hash}`);
      setMessage(`${label} confirmed: ${hash}`);
      return { hash, receipt };
    } catch (error) { setMessage(`${label} failed: ${error instanceof Error ? error.message : String(error)}`); throw error; }
    finally { setBusy(false); }
  }
  async function deploy(name: ContractName, args: readonly unknown[], field: 'position' | 'claim' | 'source' | 'market') {
    if (!ready || !wallet || !address || !isAddress(selected) || !isAddress(op || '')) return;
    const code = await publicClient.getCode({ address: selected as `0x${string}` });
    if (!code) { setMessage('The chosen payment token has no contract code on Mezo testnet.'); return; }
    const base: State = state || { chainId: mezoTestnet.id, deployer: address, token: selected, operator: op!, addresses: { token: selected as `0x${string}` }, hashes: [] };
    const artifact = artifacts[name];
    try {
      const { hash, receipt } = await transact(`Deploy ${name}`, () => wallet.deployContract({ abi: artifact.abi as Abi, bytecode: artifact.bytecode as Hex, args, account: address, chain: mezoTestnet }));
      if (!receipt.contractAddress) throw new Error('Successful receipt had no contract address; inspect the transaction before continuing.');
      save({ ...base, addresses: { ...base.addresses, [field]: receipt.contractAddress }, hashes: [...base.hashes, hash] });
    } catch { /* error shown above */ }
  }
  async function wire(name: 'claim' | 'source') {
    if (!ready || !wallet || !address || !state?.addresses.market || !state.addresses[name]) return;
    const contract = name === 'claim' ? artifacts.EpochClaim : artifacts.MockRewardSource;
    try {
      const { hash } = await transact(`Link ${name} to market`, () => wallet.writeContract({ address: state.addresses[name]!, abi: contract.abi as Abi, functionName: 'setMarket', args: [state.addresses.market], account: address, chain: mezoTestnet }));
      save({ ...state, [name === 'claim' ? 'claimWired' : 'sourceWired']: true, hashes: [...state.hashes, hash] });
    } catch { /* error shown above */ }
  }
  async function verify() {
    if (!state?.claimWired || !state.sourceWired || !state.addresses.market || !state.addresses.claim || !state.addresses.source || !state.addresses.position) return;
    setBusy(true);
    try {
      for (const value of Object.values(state.addresses)) { if (!value || !await publicClient.getCode({ address: value })) throw new Error(`No code at ${value}`); }
      const [claimMarket, sourceMarket, marketToken] = await Promise.all([
        publicClient.readContract({ address: state.addresses.claim, abi: artifacts.EpochClaim.abi as Abi, functionName: 'market' }),
        publicClient.readContract({ address: state.addresses.source, abi: artifacts.MockRewardSource.abi as Abi, functionName: 'market' }),
        publicClient.readContract({ address: state.addresses.market, abi: artifacts.EpochMarket.abi as Abi, functionName: 'token' }),
      ]);
      if (String(claimMarket).toLowerCase() !== state.addresses.market.toLowerCase() || String(sourceMarket).toLowerCase() !== state.addresses.market.toLowerCase() || String(marketToken).toLowerCase() !== state.token.toLowerCase()) throw new Error('Onchain contract wiring did not match the saved addresses.');
      setMessage('Onchain deployment and wiring verified. Open the app to mint a simulated position.');
    } catch (error) { setMessage(`Verification failed: ${error instanceof Error ? error.message : String(error)}`); }
    finally { setBusy(false); }
  }
  function reset() { if (confirm('Clear saved deployment progress on this browser? Deployed contracts stay onchain.')) { localStorage.removeItem(key); setState(undefined); setToken(mezo); setOperator(''); } }

  return <main><div className="top"><div className="logo">EPOCH / LITE</div><Link href="/">← Open app</Link></div><section className="hero"><div className="eyebrow">MEZO TESTNET · CHAIN 31611</div><h1>Deploy with MetaMask</h1><p>Use the official testnet MEZO or MUSD token. The simulated position and reward source are clearly labeled. The wallet signs each transaction; this page never asks for a seed phrase or private key.</p></section>
    <section className="card risk"><strong>Before signing:</strong> four contract deployments and two wiring transactions spend test BTC gas. The selected wallet becomes the mock NFT minter and contract admin. Choose an operator account that can fund rewards with the selected token. This is testnet code; do not use with real funds.</section>
    <div className="grid"><section className="card"><h2>Wallet and token</h2>{!address ? <button onClick={() => connect({ connector: connectors[0] })}>Connect MetaMask</button> : <p>{address} · chain {chainId}</p>}{address && chainId !== mezoTestnet.id && <button onClick={() => switchChain({ chainId: mezoTestnet.id })}>Switch to Mezo testnet</button>}<label className="field">Official payment token<select disabled={!!state} value={token} onChange={e => setToken(e.target.value)}><option value={mezo}>Official testnet MEZO</option><option value={musd}>Official testnet MUSD</option></select></label><label className="field">Mock reward operator public address<input disabled={!!state} placeholder="Defaults to connected wallet" value={operator} onChange={e => setOperator(e.target.value)} /></label><p className="muted">Your known wallet has test BTC and MEZO; MUSD balance was zero at last check. To show a purchase, a separate buyer account needs the selected token and test BTC.</p></section>
    <section className="card"><h2>Deployment progress</h2><p>Signer: <code>{admin || '—'}</code></p><p>Operator: <code>{op || '—'}</code></p><p>Token: <code>{selected}</code></p><p>Position: <code>{state?.addresses.position || '—'}</code></p><p>Claim: <code>{state?.addresses.claim || '—'}</code></p><p>Source: <code>{state?.addresses.source || '—'}</code></p><p>Market: <code>{state?.addresses.market || '—'}</code></p><p>Claim linked: {state?.claimWired ? 'yes' : 'no'} · source linked: {state?.sourceWired ? 'yes' : 'no'}</p></section></div>
    <div className="status" role="status">{message}</div><section className="card"><h2>Sign in order</h2><button disabled={!ready || busy || !!state?.addresses.position} onClick={() => deploy('MockVeBTC', [admin], 'position')}>1. Deploy mock position</button><button disabled={!ready || busy || !state?.addresses.position || !!state.addresses.claim} onClick={() => deploy('EpochClaim', [admin], 'claim')}>2. Deploy claim NFT</button><button disabled={!ready || busy || !state?.addresses.claim || !!state.addresses.source} onClick={() => deploy('MockRewardSource', [admin, op, selected], 'source')}>3. Deploy mock source</button><button disabled={!ready || busy || !state?.addresses.source || !!state.addresses.market} onClick={() => deploy('EpochMarket', [state!.addresses.position, state!.addresses.claim, state!.addresses.source, selected], 'market')}>4. Deploy market</button><button disabled={!ready || busy || !state?.addresses.market || !!state.claimWired} onClick={() => wire('claim')}>5. Link claim to market</button><button disabled={!ready || busy || !state?.claimWired || !!state.sourceWired} onClick={() => wire('source')}>6. Link source to market</button><button disabled={!ready || busy || !state?.sourceWired} onClick={verify}>7. Verify onchain</button><p><Link href="/">Open app after verification →</Link></p><button className="secondary" disabled={busy} onClick={reset}>Clear browser progress</button></section>
    <section className="card"><h2>Record for submission</h2><p>Save these addresses and transaction links. Browser storage alone is not durable and other visitors will not see your deployment until the same addresses are published in the app configuration.</p><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(state, null, 2) || 'No transaction sent yet'}</pre></section>
  </main>;
}
