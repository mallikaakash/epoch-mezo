# Epoch Lite — Wave 1 submission draft

Use only after the Mezo testnet contract deployment and token transaction are confirmed. Replace the bracketed placeholders with verified public evidence. The current GitHub repository and frontend alone do not meet the working integration requirement.

| Field | Paste-ready draft |
| --- | --- |
| Project | Epoch Lite |
| Category (3–5 words) | Bitcoin Future Revenue Marketplace |
| TL;DR | A Mezo testnet prototype where a holder sells one simulated future reward claim for official testnet MEZO while retaining the simulated position NFT. |
| Track | Track 1 — DeFi |
| Chain | Mezo testnet (chain ID 31611) |
| Live product | https://mezo-buildathon.vercel.app/ — add the verified contract explorer link: [MARKET_EXPLORER_URL] |
| Public code | https://github.com/mallikaakash/epoch-mezo |
| Deck | https://mezo-buildathon.vercel.app/pitch.html (verify this route after the latest deployment) |
| Two-minute video | [PUBLIC_VIDEO_URL — user recording required] |
| Status | [DEPLOYED_TESTNET / LOCAL_ONLY — select truthfully] |

## Problem and operation

Bitcoin holders may want liquidity against expected future revenue without selling their underlying position. Epoch Lite explores whether those rights can be separated. A seller deposits a **mock** veBTC-like NFT and lists a fixed-price right to one simulated reward period. The buyer pays the seller in official testnet MEZO and receives a transferable claim NFT. A designated operator deposits MEZO into an onchain mock reward source. After the period ends, the market finalizes the amount actually funded; the current claim holder redeems it, which can be zero. The original seller later withdraws the same mock position NFT. No real BTC is escrowed, no live veBTC or fee stream is connected, and rewards come from the operator's test tokens.

## Target group and differentiation

Target group: Bitcoin holders with locked, revenue-producing positions and buyers who want a clearly bounded future revenue claim. The prototype tests the contract rights, accounting, transfer, and principal return flow before a real Mezo position adapter is attempted. It makes no claim of guaranteed return or production readiness.

## Technology and evidence

Solidity 0.8.24, Foundry, OpenZeppelin, Next.js 16, React, wagmi, viem, MetaMask, Mezo testnet. The repository has 13 passing Foundry tests and a local multi-account lifecycle run. Testnet proof: [MARKET_ADDRESS], [TOKEN_PAYMENT_TX], [FUNDED_REWARD_TX], [REDEEM_TX], [NFT_RETURN_TX]. Verify these links before submission; local Anvil hashes do not count as testnet evidence.

## Three milestones

1. **Within 2 weeks:** Add a read-only adapter for an actual Mezo position and independently validate lock/epoch metadata.
2. **Within 4 weeks:** Integrate a verifiable reward source and permissionless settlement, replacing operator-supplied mock rewards.
3. **Within 8 weeks:** Independent security review, economic stress tests, and a capped pilot with explicit redemption and exit rules.

## Two-minute video outline

0:00–0:20 — Show the holder's problem and the mock boundary. 0:20–0:45 — Mint a mock position and list its one-period claim. 0:45–1:10 — Switch to a separate buyer; approve MEZO and buy the claim. 1:10–1:35 — Fund the mock source with testnet MEZO, finalize, and redeem as claim holder. 1:35–1:50 — Show the seller recovering the original NFT. 1:50–2:00 — State the next work: real position and reward adapters, security review. Capture the explorer transactions on screen and say explicitly that current rewards are simulated.

The project owner must add their own team details, social links, eligibility attestations, and public video. See [Setup.md](./Setup.md) for the live form and rules.
