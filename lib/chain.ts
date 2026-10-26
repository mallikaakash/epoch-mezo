import { defineChain } from 'viem';
import deployment from '../deployments/mezo-testnet.json';

export const mezoTestnet = defineChain({
  id: 31611,
  name: 'Mezo Testnet',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.test.mezo.org'] } },
  blockExplorers: { default: { name: 'Mezo Testnet Explorer', url: 'https://explorer.test.mezo.org' } },
  testnet: true,
});

const published = deployment.addresses as { market?: `0x${string}`; claim?: `0x${string}`; position?: `0x${string}`; source?: `0x${string}`; token?: `0x${string}` };
export const addresses = {
  market: (process.env.NEXT_PUBLIC_EPOCH_MARKET_ADDRESS || published.market) as `0x${string}` | undefined,
  claim: (process.env.NEXT_PUBLIC_EPOCH_CLAIM_ADDRESS || published.claim) as `0x${string}` | undefined,
  position: (process.env.NEXT_PUBLIC_MOCK_VEBTC_ADDRESS || published.position) as `0x${string}` | undefined,
  source: (process.env.NEXT_PUBLIC_MOCK_SOURCE_ADDRESS || published.source) as `0x${string}` | undefined,
  token: (process.env.NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS || published.token) as `0x${string}` | undefined,
};
export const economicMode = process.env.NEXT_PUBLIC_ECONOMIC_MODE || 'OFFICIAL_TESTNET_MUSD';

export type DeploymentAddresses = typeof addresses;
export function readLocalDeployment(): DeploymentAddresses | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const saved = JSON.parse(localStorage.getItem('epoch-lite-deployment-v1') || 'null');
    return saved?.chainId === mezoTestnet.id ? saved.addresses as DeploymentAddresses : undefined;
  } catch { return undefined; }
}
