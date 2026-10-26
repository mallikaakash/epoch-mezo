import { readFile, writeFile, mkdir } from 'node:fs/promises';
const contracts = ['EpochMarket', 'EpochClaim', 'MockVeBTC', 'MockRewardSource', 'EpochDemoUSD'];
const abis = {};
for (const name of contracts) {
  const artifact = JSON.parse(await readFile(`out/${name}.sol/${name}.json`, 'utf8'));
  abis[name] = artifact.abi;
}
await mkdir('lib', { recursive: true });
await writeFile('lib/abis.json', JSON.stringify(abis, null, 2) + '\n');
console.log('Exported ABI files for web client.');
