import './globals.css';
import Providers from './providers';

export const metadata = { title: 'Epoch Lite | Mezo testnet', description: 'A simulated future reward claim market on Mezo testnet.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
