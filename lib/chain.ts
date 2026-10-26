import { defineChain } from 'viem';

export const mezoTestnet = defineChain({
  id: 31611,
  name: 'Mezo Testnet',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.test.mezo.org'] } },
  blockExplorers: { default: { name: 'Mezo Testnet Explorer', url: 'https://explorer.test.mezo.org' } },
  testnet: true,
});

export const addresses = {
  market: process.env.NEXT_PUBLIC_EPOCH_MARKET_ADDRESS as `0x${string}` | undefined,
  claim: process.env.NEXT_PUBLIC_EPOCH_CLAIM_ADDRESS as `0x${string}` | undefined,
  position: process.env.NEXT_PUBLIC_MOCK_VEBTC_ADDRESS as `0x${string}` | undefined,
  source: process.env.NEXT_PUBLIC_MOCK_SOURCE_ADDRESS as `0x${string}` | undefined,
  token: process.env.NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS as `0x${string}` | undefined,
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
