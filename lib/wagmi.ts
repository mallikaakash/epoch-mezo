import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { mezoTestnet } from './chain';

export const config = createConfig({
  chains: [mezoTestnet],
  connectors: [injected()],
  transports: { [mezoTestnet.id]: http('https://rpc.test.mezo.org') },
  ssr: true,
});
