const CHAIN_ID = '0x7b7b'; // 31611
const RPC_URL = 'https://rpc.test.mezo.org';
const TOKENS = {
  musd: '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503',
  mezo: '0x7B7c000000000000000000000000000000000001'
};
const el = id => document.getElementById(id);
let account = null;
let requestId = 0;

function formatUnits(hex, decimals = 18) {
  const value = BigInt(hex || '0x0');
  const unit = 10n ** BigInt(decimals);
  const whole = value / unit;
  const fraction = String(value % unit).padStart(decimals, '0').slice(0, 6).replace(/0+$/, '');
  return `${whole}${fraction ? '.' + fraction : ''}`;
}

function setStatus(message) { el('status').textContent = message; }
function clearBalances() { for (const id of ['btc', 'musd', 'mezo']) el(id).textContent = '—'; }
async function call(method, params = []) { return window.ethereum.request({ method, params }); }
async function tokenBalance(token, owner) {
  const data = '0x70a08231' + owner.slice(2).toLowerCase().padStart(64, '0');
  return call('eth_call', [{ to: token, data }, 'latest']);
}

async function refresh() {
  const run = ++requestId;
  if (!window.ethereum || !account) return;
  try {
    const chain = await call('eth_chainId');
    if (run !== requestId) return;
    const correct = chain.toLowerCase() === CHAIN_ID;
    el('network').textContent = correct ? 'Mezo testnet' : `Wrong network (${parseInt(chain, 16)})`;
    el('switch').hidden = correct;
    el('refresh').hidden = !correct;
    el('address').textContent = account;
    clearBalances();
    if (!correct) { setStatus('Switch to Mezo testnet to read balances.'); return; }
    setStatus('Reading balances…');
    const [btc, musd, mezo] = await Promise.all([
      call('eth_getBalance', [account, 'latest']),
      tokenBalance(TOKENS.musd, account),
      tokenBalance(TOKENS.mezo, account)
    ]);
    if (run !== requestId) return;
    el('btc').textContent = `${formatUnits(btc)} BTC`;
    el('musd').textContent = `${formatUnits(musd)} MUSD`;
    el('mezo').textContent = `${formatUnits(mezo)} MEZO`;
    setStatus('Balances read from your connected wallet provider.');
  } catch (error) {
    if (run === requestId) setStatus(`Could not read wallet: ${error.message || error}`);
  }
}

el('connect').addEventListener('click', async () => {
  if (!window.ethereum) { setStatus('No EVM wallet found. Install or open an EVM browser wallet, then try again.'); return; }
  try {
    const accounts = await call('eth_requestAccounts');
    account = accounts[0] || null;
    if (!account) { setStatus('Wallet returned no account.'); return; }
    el('connect').textContent = 'Change account';
    await refresh();
  } catch (error) { setStatus(`Wallet connection was not completed: ${error.message || error}`); }
});

el('switch').addEventListener('click', async () => {
  try {
    await call('wallet_switchEthereumChain', [{ chainId: CHAIN_ID }]);
  } catch (error) {
    if (error.code !== 4902) { setStatus(`Network switch was not completed: ${error.message || error}`); return; }
    try {
      await call('wallet_addEthereumChain', [{ chainId: CHAIN_ID, chainName: 'Mezo Testnet', rpcUrls: [RPC_URL], nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 }, blockExplorerUrls: ['https://explorer.test.mezo.org/'] }]);
    } catch (addError) { setStatus(`Network addition was not completed: ${addError.message || addError}`); return; }
  }
  await refresh();
});

el('refresh').addEventListener('click', refresh);
if (window.ethereum) {
  window.ethereum.on?.('accountsChanged', accounts => { account = accounts[0] || null; requestId++; if (account) refresh(); else { el('address').textContent = '—'; clearBalances(); setStatus('Wallet disconnected.'); } });
  window.ethereum.on?.('chainChanged', refresh);
  call('eth_accounts').then(accounts => { if (accounts[0]) { account = accounts[0]; el('connect').textContent = 'Change account'; refresh(); } }).catch(() => {});
}
