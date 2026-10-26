# Mezo Buildathon: testnet setup and submission requirements

Checked on **26 October 2026** against the [AKINDO Buildathon page](https://app.akindo.io/wave-hacks/OVOO0gdrVU8379D10) and [Mezo's Buildathon announcement](https://testnet.mezo.org/blog/mezo-buildathon-is-underway/). The live AKINDO page and its countdown are authoritative for the deadline; recheck them before submitting. This repository is currently a **local Epoch Lite prototype**, not a valid submission by itself.

## Deadline and tracks

| Wave | Build window | Submission | Judging | Pool |
| --- | --- | --- | --- | --- |
| 1 | 16–26 Oct 2026 | 26 Oct 2026; portal showed 20:30 India time on 26 Oct | 27 Oct–1 Nov | $2,000 worth of MEZO |
| 2 | 2–15 Nov 2026 | 15 Nov 2026, before AKINDO's live deadline | 16–22 Nov | $5,000 worth of MEZO |

Winner announcement and online demo: **23 Nov 2026**. Select Track 1 (DeFi: borrowing, lending, looping, yield), Track 2 (Access & Distribution), or both. Wave 2 submissions must show meaningful new progress. [Source: AKINDO](https://app.akindo.io/wave-hacks/OVOO0gdrVU8379D10).

## Eligibility and hard submission requirements

- Every participant must be at least **18**, register individually on AKINDO, join the [Mezo Discord](https://discord.mezo.org), complete registration questions, and agree to the Terms of Participation. A person can join only one team per wave. The user must personally review and accept those terms; this project cannot establish personal eligibility.
- Residents of, or people located in, the prohibited jurisdictions on the AKINDO page are excluded. Employees of Supernormal and relevant subcontractors, and their relatives, are also excluded. **Check the current full list and terms on AKINDO**, including sanctions conditions, before registration.
- The project must integrate **MUSD and/or MEZO**, extend its utility, and have a **working deployment** on Mezo, Ethereum, Base, or BNB Chain. **Mezo testnet is accepted.** It must be built during the event or be a new approach/extension to an existing product. Credit reused code; reused code must be open source and cited. Do not infringe third-party IP.
- Submit through **AKINDO before the applicable wave deadline**. AKINDO screening checks the token integration, working deployment, and all materials before Mezo judges it.
- If selected for a reward, Mezo requires **KYB** before payment. This may involve identity, tax, address and wallet information; it is a prize-disbursement condition, not something this repo can complete. See [AKINDO rules and terms](https://app.akindo.io/wave-hacks/OVOO0gdrVU8379D10).

AKINDO lists these submission materials:

1. Testnet or mainnet link to the **live project**.
2. **Public GitHub repository**.
3. **Project/product deck**.
4. **Two-minute pitch video**.

The form asks for project name; 3–5-word category; one-sentence TL;DR; problem, operation, and MUSD/MEZO use; target group; tech stack; track; deployment chain; new versus extended-product status; readiness; three future milestones with timelines; and team members/roles/social links. For an extension, link the existing product. For Wave 2, state the changes since Wave 1. The page's comment from AKINDO also reminds builders to include the project link, GitHub repo and two-minute video. [Source: AKINDO](https://app.akindo.io/wave-hacks/OVOO0gdrVU8379D10).

Judging weights: Mezo integration **30%**, product/business viability **30%**, technical implementation **20%**, UX **10%**, submission materials **10%**. A balance display alone is unlikely to demonstrate the depth of integration or product viability these criteria reward. [Source: AKINDO](https://app.akindo.io/wave-hacks/OVOO0gdrVU8379D10).

**Separate rule:** [Mezo Market listing requirements](https://mezo.org/docs/developers/getting-started/dapp-requirements/) mention a third-party audit and mainnet deployment. Those are for Mezo Market featuring/promotional support, **not the Buildathon's testnet eligibility rules**.

## Mezo testnet configuration

| Parameter | Value |
| --- | --- |
| Network | Mezo Testnet |
| Chain ID | `31611` (`0x7b7b`) |
| RPC | `https://rpc.test.mezo.org` |
| WebSocket | `wss://rpc-ws.test.mezo.org` |
| Native gas token | BTC, 18 decimals |
| Explorer | `https://explorer.test.mezo.org/` |
| Faucet | `https://faucet.test.mezo.org/` |
| MUSD token | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` |
| MEZO token | `0x7B7c000000000000000000000000000000000001` |

Network and faucet: [Mezo developer guide](https://mezo.org/docs/developers/getting-started/). MUSD and MEZO addresses: [Mezo contract reference](https://mezo.org/docs/users/resources/contracts-reference/) and [Mezo MUSD x402 overview](https://mezo.org/docs/developers/getting-started/musd-payments-x402/). On 26 October, the official testnet RPC returned code at both addresses and `18` decimals for both tokens. Verify contract addresses again before building a transaction flow. The shared RPC can change or rate-limit requests.

## Wallet and funds: steps for the project owner

1. Use a separate **EVM testnet wallet/account** in MetaMask or another EVM-compatible wallet. Keep its recovery phrase and private key in the wallet only; never put them in chat, the repo, a screenshot, or a `.env` file shared with others. A public `0x...` address is enough for funding and read-only checks.
2. Run the app (`npm run dev`), open `http://localhost:3000`, select **Connect EVM wallet**, and approve the wallet's connection prompt. Select **Switch to Mezo testnet** if prompted. Verify chain ID `31611` in the wallet. The Epoch contract actions remain disabled until deployment addresses are configured.
3. Visit the [official testnet faucet](https://faucet.test.mezo.org/) and request test BTC and MEZO for your public testnet address. It uses a CAPTCHA, which you must complete yourself. BTC pays Mezo gas.
4. To get test MUSD, use the [Mezo testnet app](https://testnet.mezo.org/) to borrow against test BTC or swap BTC to MUSD, as AKINDO instructs. Borrowing creates debt and liquidation risk even on testnet; understand the flow before approving wallet prompts.
5. Return to this starter and refresh balances. Confirm the address and balances in the [testnet explorer](https://explorer.test.mezo.org/) too.

The current app makes **read-only calls** through the connected wallet provider. It does not ask for a seed, store keys, sign messages, or send transactions. Wallet connection/network-addition approvals happen in your wallet. Browser wallets generally do not inject into the Codex in-app browser; use your normal browser with the extension installed for the connected-wallet check.

## Local development

Requires Node.js 20+, Foundry, and installed npm dependencies.

```bash
npm ci
forge test -vvv
npm run contracts:build
npm run build
npm run dev
```

Then open `http://localhost:3000`. Optional live RPC check (requires internet access to Mezo):

```bash
npm run rpc:check
```

The `.env.example` is a reference only; it contains no secrets. The UI currently supports EVM wallet providers such as MetaMask. Mezo Passport can later add native Bitcoin-wallet connections if the product calls for them; [Mezo documents it as optional](https://mezo.org/docs/developers/getting-started/).

## Current status and next implementation gate

- [x] Epoch Lite mock NFT, claim NFT, fixed-price market, funded mock reward source, and demo-token fallback contracts.
- [x] Foundry contract lifecycle tests and ABI export.
- [x] Next.js wallet and contract console with chain reads and wallet-signed writes; local production build passes.
- [ ] Owner connects a wallet, completes faucet CAPTCHA, and obtains test funds.
- [ ] Deploy and verify the contracts on Mezo testnet with official testnet MEZO or MUSD; use a signer controlled by the project owner. The MetaMask deployment screen is at `/deploy`.
- [ ] Implement and test that workflow, deploy it publicly on Mezo testnet, and collect explorer links/transaction evidence.
- [x] Publish the [public GitHub repo](https://github.com/mallikaakash/epoch-mezo).
- [ ] Publish a live frontend, prepare the deck and two-minute video, and submit through AKINDO before the deadline.

No Epoch contract or frontend has been deployed publicly yet. No Epoch token transaction has been executed or verified. Local passing tests alone **do not satisfy** AKINDO's integration and deployment requirements. See [README.md](./README.md) for precise progress and mock boundaries.
