# Epoch Lite

Epoch Lite is a **Mezo testnet proof of rights separation**: a seller escrows a **simulated** BTC-position NFT, sells one future **simulated** reward claim for a fixed ERC-20 price, and later recovers that same mock principal NFT. The claim is transferable, and its current holder receives only the amount actually funded into the onchain mock reward source. See [LITE_SCOPE.md](./LITE_SCOPE.md) for the scope and [SPEC.md](./SPEC.md) for the longer-term idea.

**Nothing here escrows actual BTC, controls a real veBTC position, or collects real Mezo fees.** The 0.10 BTC position, two-minute epoch, 8-token sale, and 12-token reward are demonstration fixtures. The buyer can receive zero and lose the full purchase price. No return is promised.

## Verified Mezo testnet deployment

Chain ID **31611**. The four Epoch contracts have deployed code, the claim and mock reward source are linked to the market, and the market references the official testnet MEZO token. Verified on 26 October 2026. The mock trade lifecycle still needs an onchain purchase and settlement trace.

| Contract | Address and explorer |
| --- | --- |
| EpochMarket | [`0x111f7DBd762e8b7d58eC6d2687a61446300B40EF`](https://explorer.test.mezo.org/address/0x111f7DBd762e8b7d58eC6d2687a61446300B40EF) |
| EpochClaim NFT | [`0xdb603d247523d337cE145aA5d191B84B33a0f3DE`](https://explorer.test.mezo.org/address/0xdb603d247523d337cE145aA5d191B84B33a0f3DE) |
| MockVeBTC position NFT | [`0x093F755a9E5bD86d8E7e480Ea693CfadA578B094`](https://explorer.test.mezo.org/address/0x093F755a9E5bD86d8E7e480Ea693CfadA578B094) |
| MockRewardSource | [`0x02F71a3CBE00258f924c76a31640F711F9F03218`](https://explorer.test.mezo.org/address/0x02F71a3CBE00258f924c76a31640F711F9F03218) |
| Official testnet MEZO payment token | [`0x7B7c000000000000000000000000000000000001`](https://explorer.test.mezo.org/address/0x7B7c000000000000000000000000000000000001) |

[Live app](https://mezo-buildathon.vercel.app/) · [Draft pitch deck](https://mezo-buildathon.vercel.app/pitch.html) · [Machine-readable deployment manifest](./deployments/mezo-testnet.json)

## Current progress (26 October 2026)

| Area | Status |
| --- | --- |
| Market, claim NFT, mock position NFT, funded mock reward source | Implemented and compiling |
| Local lifecycle and adverse-path tests | 13 Foundry tests pass, including 256 fuzz cases for funded reward accounting |
| Local multi-account Anvil scenario | Passed: separate seller, buyer, operator, and claim recipient; funded payout and original NFT return |
| Next.js + wagmi/viem frontend | Production build passes; MetaMask deployment screen added at `/deploy` |
| Mezo testnet deployment | Four Epoch contracts deployed and wired; addresses in `deployments/mezo-testnet.json` |
| Live wallet-to-wallet MUSD transaction trace | **Not done** |
| Pitch deck | Local HTML draft at `/pitch.html`; labeled with mock and deployment limits, not published |
| Public GitHub repository | [Published](https://github.com/mallikaakash/epoch-mezo) |
| Public site and draft deck | [Frontend](https://mezo-buildathon.vercel.app/) and [deck](https://mezo-buildathon.vercel.app/pitch.html) returned HTTP 200 on 26 October; contracts remain unconfigured |
| Two-minute video and AKINDO submission | **Not done** |

The frontend uses live RPC reads and signed wallet transactions once deployment addresses are supplied. It does not use a database to declare settlement. Until deployment, it shows an explicit unconfigured state.

## Local commands

Requires Node 20+, Foundry (`forge`, `anvil`, `cast`), and an EVM wallet for a browser demo.

```bash
npm ci
forge test -vvv
npm run contracts:build
npm run build
npm run dev
```

Open `http://localhost:3000`. `npm run contracts:build` exports compiled ABIs and bytecode to `lib/abis.json` and `lib/deploy-artifacts.json` for the web client. The old read-only wallet starter remains under `public/` and can be run with `npm run starter`, but the main application is the Next.js frontend.

For a disposable **local-only** transaction run, start Anvil on `127.0.0.1:8545`, deploy with `Deploy.s.sol` using Anvil's unlocked first account as `ADMIN_ADDRESS`, its third account as `OPERATOR_ADDRESS`, and `USE_DEMO_TOKEN=true`. Then run `npm run demo:local`. The script checks chain ID `31337`, uses five Anvil accounts, advances **local** time, verifies the final NFT and token balances, and prints its local transaction hashes. These hashes are **not Mezo testnet evidence**.

## Contracts and rights

- `MockVeBTC`: minter-controlled test NFT, fixed illustrative principal of 10,000,000 sats (0.10 BTC), configurable mock unlock time. No BTC backing.
- `EpochMarket`: escrows only the mock NFT, lists one active offer per escrow, transfers the fixed ERC-20 price to the seller, finalizes a funded reward, restricts redemption to the **current claim owner**, and returns the original NFT only to the original seller after settlement/redemption or cancellation and lock expiry.
- `EpochClaim`: transferable ERC-721 claim, minted on purchase and burned on redemption. It confers no principal rights.
- `MockRewardSource`: designated operator deposits actual configured ERC-20 tokens per sold offer. The market can consume the recorded amount once after the mock epoch. Donated tokens do not increase the recognized reward.
- `EpochDemoUSD`: **test-only fallback**, clearly named **NOT MUSD**. This fallback does not by itself meet the Buildathon's MUSD/MEZO integration requirement.

The market and source use one configured ERC-20 as both quote and payout token. The intended Buildathon mode is the official [testnet MUSD](https://mezo.org/docs/users/resources/contracts-reference/) at `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`. On 26 October the official Mezo testnet RPC showed token code and 18 decimals at that address. Revalidate at deployment.

If test MUSD is unavailable, the same contracts can use official Mezo testnet **MEZO** at `0x7B7c000000000000000000000000000000000001`; set the payment and frontend token addresses to it and `NEXT_PUBLIC_ECONOMIC_MODE=REAL_TESTNET_MEZO`. Then the example is **8 MEZO paid / 12 MEZO mock reward**, not MUSD. This is a genuine MEZO token integration, but the reward remains operator-supplied and simulated. The explicitly named demo ERC-20 is only a local/functionality fallback and should not be submitted alone as the required asset integration.

## Testnet deployment gate

The MetaMask deployment screen at `/deploy` deploys the four contracts and links the claim and source to the market through six separate wallet confirmations. It saves confirmed addresses and transaction hashes in this browser's local storage, and verifies contract code and wiring onchain. After checking the public deployment record, copy its `addresses` into `deployments/mezo-testnet.json` and redeploy the frontend so all visitors see the same contracts. The five `NEXT_PUBLIC_*_ADDRESS` variables can override the manifest. The alternative Foundry deployment script is [Deploy.s.sol](./contracts/script/Deploy.s.sol). It rejects mainnet and wires market-only roles. Provide `ADMIN_ADDRESS` (the deployer signer), `OPERATOR_ADDRESS`, `USE_DEMO_TOKEN=false`, and `PAYMENT_TOKEN_ADDRESS` in an ignored local environment. **Do not place or send a private key in chat or the repository.** Use a signer managed by your wallet/Foundry locally. A public address alone cannot authorize deployment transactions.

Before broadcasting, inspect the generated transactions and fund the signer with test BTC. After broadcasting, record verified contract addresses and transaction hashes in `deployments/mezo-testnet.json` and `.env.local`, then restart Next.js. Do not populate that manifest from predicted addresses or simulation output. The demo requires separate seller, buyer, and mock-source operator roles; these can be separate test accounts under one wallet, but each transaction must be signed by the role's account. The official [Mezo testnet faucet](https://faucet.test.mezo.org/) provides test BTC and MEZO. Test MUSD must be acquired through the [Mezo testnet app](https://testnet.mezo.org/) by borrowing or swapping; the faucet alone is not assumed to supply it.

## Submission status and Wave 1 assessment

[AKINDO](https://app.akindo.io/wave-hacks/OVOO0gdrVU8379D10) requires a **working MUSD and/or MEZO integration**, a working deployment on a supported chain (Mezo testnet accepted), a live project link, public GitHub repo, project deck, and two-minute pitch video. The full checklist is in [Setup.md](./Setup.md).

**The contracts are deployed and wired, but a testnet purchase and reward lifecycle have not been verified yet; this is not a complete Wave 1 submission.** If the purchase/settlement/return flow is shown with genuine testnet MEZO, Epoch Lite appears to meet the event's stated hard technology requirements, subject to AKINDO's screening. The mock rewards and position likely limit the score for Mezo integration and product viability; they must be disclosed in every material. A demo-token-only deployment would not establish the mandatory MUSD/MEZO integration.

## Known limitations

- No real veBTC custody, voting, source adapter, real epoch fee accounting, or production security review.
- If a sold claim holder never redeems, the seller cannot withdraw the mock position. Buyer rewards are not silently seized or timed out.
- The mock source operator is trusted to choose and fund the reward amount, including zero.
- The frontend has not been exercised against deployed Epoch contracts or a browser wallet. Wallet prompts and real transaction behavior remain to verify.
- The current runtime dependency tree passed `npm audit --omit=dev --audit-level=moderate` after upgrading wagmi and viem. Recheck before any public deployment; the project remains a testnet prototype.
