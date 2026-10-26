# EPOCH LITE
## Current Hackathon Scope and Build Specification

**Version:** 1.0 (implementation brief)  
**Date:** 26 October 2026  
**Target:** Mezo testnet, EVM chain ID `31611`  
**Audience:** Developer, Codex or coding agent, smart-contract reviewer, demo presenter  
**Objective:** A verifiable, end-to-end proof that a future-reward claim can be sold independently from a simulated Bitcoin-backed principal position.

> **THE DEMO BOUNDARY:** Epoch Lite **does not yet escrow real BTC or a live veBTC NFT** and **does not collect actual Mezo rewards**. It uses a mock source-position NFT and a mock reward distributor. The purchase and redemption transactions should use **real testnet MUSD if accessible**. A clearly labeled demo ERC-20 on testnet is a fallback if adequate testnet MUSD cannot be obtained. No mocks should be presented as live financial results.

### North-star demo

Alice controls a simulated veBTC-like NFT representing a **fictional 0.10 BTC position**. She offers its next simulated epoch reward for **8 MUSD**. Bob purchases the reward claim in an actual onchain transaction and receives a transferable ERC-721. A mock source then supplies **12 MUSD** as the hypothetical realized reward. Bob claims the 12 MUSD, while Alice eventually withdraws **the original mock position NFT**, not Bob. Every transaction can be inspected on the target testnet explorer.

> Values are demonstration fixtures, not a fee forecast. Include a zero-reward and a losing-buyer scenario in tests.

---

## 1. Product outcome and definition of done

The project is complete for Epoch Lite when an independent reviewer can:

- Connect two EVM wallets to Mezo testnet.
- See which source is simulated and which token transfers are genuine testnet transfers.
- Create an offer by escrowing a mock principal NFT.
- Purchase the offer before its simulated epoch begins, paying exactly the listing price in the configured ERC-20.
- Observe the ERC-721 revenue claim owned by the buyer.
- Transfer the claim to a third address and see redemption rights follow that current owner.
- Finalize an epoch with a demonstrably funded amount from the mock rewards contract.
- Redeem the actual payout amount without manual database edits.
- Return the original mock principal NFT only to its immutable depositor after settlement and lock expiry.
- Inspect contract addresses, explorer transaction links, and test results in the repository.

**Priority:** smart-contract correctness > verifiable payment > readable UI > polish. An auction, exchange, valuation AI, and real veBTC compatibility are not success requirements.

### Current vs future scope

| Area | Lite in scope | Explicitly out of scope |
|---|---|---|
| Principal | ERC-721 mock position, ERC-721 escrow and safe return | Native BTC custody, live veBTC custody, Mezo BTC lock creation |
| Rewards | Funded mock rewards in one ERC-20 | Actual chain fee/gauge rewards, historical claim reconciliation |
| Market | Fixed-price single-buyer sale | AMM, auctions, orderbook, leverage, liquidations |
| Claim | One 100% claim per offer and epoch | ERC-1155 fractions, PT token, multi-epoch portfolios |
| Settlement | One explicit finalize and one redeem | Multi-token swaps, offchain attestations of real fees |
| Frontend | Seller, buyer, settlement console and status | Portfolio analytics, user profiles, charting infrastructure |
| Storage | Contract state and optional client-side event indexing | Backend database as settlement authority |
| Deployment | Mezo testnet with safe fallbacks | Mainnet, public BTC deposits, real-value usage |

---

## 2. Chain configuration and verified integration references

**Use a central `config/chains.ts` or equivalent configuration file.** Never scatter chain values or addresses across components. Do not copy an unrelated community-repository veBTC address into the contract configuration.

| Property | Testnet value | Source |
|---|---|---|
| Chain ID | `31611` | Mezo developer docs |
| RPC | `https://rpc.test.mezo.org` | Mezo developer docs |
| Explorer | `https://explorer.test.mezo.org` | Mezo developer docs |
| Native gas token | BTC, 18 decimals | Mezo developer docs |
| Testnet MUSD | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` | Official Mezo contracts reference |
| Official testnet VeBTC reference, research only | `0xB63fcCd03521Cf21907627bd7fA465C129479231` | Official developer Mezo Pools table |
| Official testnet rewards distributor reference, research only | `0x10B0E7b3411F4A38ca2F6BB697aA28D607924729` | Official developer Mezo Pools table |

**Live deployment must revalidate code, ABI, asset decimals, balance, and chain ID.** VeBTC and distributor references are **not used by the Lite mock position contracts**. An address being listed in documentation is not proof of a function ABI or wrapper compatibility.

Official docs:

- https://testnet.mezo.org/docs/developers/getting-started/
- https://mezo.org/docs/users/resources/contracts-reference
- https://mezo.org/docs/developers/features/mezo-pools

Funding dependencies:

1. Acquire enough Mezo testnet BTC for transaction gas.
2. Check whether both wallets and the reward-funding wallet have adequate **testnet MUSD**; do not assume that the native BTC faucet also provides MUSD.
3. **Primary mode `REAL_TESTNET_MUSD`:** connect official testnet MUSD and make real testnet ERC-20 transfers.
4. **Fallback mode `DEMO_ERC20`:** deploy an `EpochDemoUSD` ERC-20 and flag its address and mock status prominently across the app, video, README, and submission. Do **not** label that currency MUSD.

This is a testnet demo. Even genuine testnet MUSD has no implied production redemption value.

---

## 3. User stories and acceptance criteria

### US-01: Create a mock position

**As Alice**, I want a demo veBTC-like ERC-721 position that represents an illustrative amount of BTC, so I can test revenue separation without risking BTC.

Acceptance:

- Mint a mock NFT to Alice on Mezo testnet.
- Metadata records `illustrativePrincipalSats = 10_000_000` (0.10 BTC) or an equivalent clearly labeled demo quantity.
- No actual BTC payment or BTC custody occurs; UI explicitly reads `SIMULATED POSITION`.
- Only a designated demo minter can mint; this is clearly restricted to test deployments.

### US-02: List one future reward claim

**As Alice**, I can approve and escrow the mock NFT and list the entire single-token reward for a particular simulated epoch at a fixed ERC-20 price.

Acceptance:

- `createOffer` verifies Alice owns the NFT and has approved the market.
- It records immutable principal beneficiary, source NFT address and token ID, simulated epoch start/end, quote token, payout token, and price.
- Must be created **before** the simulated epoch starts.
- Ownership of underlying NFT becomes `EpochMarket` during sale/settlement.
- Duplicate claims for same source NFT and overlapping period are prevented; Lite permits only one active offer per deposited mock NFT.

### US-03: Purchase the claim

**As Bob**, I can purchase one listed claim and receive its NFT in the same transaction that pays Alice.

Acceptance:

- `buyOffer` checks listing active, `block.timestamp < epochStart`, nonzero price, and buyer not seller (optional but recommended).
- Buyer approves the full quote token price.
- Market uses `SafeERC20.safeTransferFrom` to transfer price to seller atomically with minting claim NFT.
- Claim NFT is minted to buyer and points to the source offer ID.
- Second purchase or seller cancellation after purchase fails.
- Listing events include purchaser, seller, price, currency, and claim ID.

### US-04: Transfer revenue ownership

**As Bob**, I can transfer my claim NFT to Carol before redemption, and Carol becomes the only authorized redeemer.

Acceptance:

- Current ERC-721 `ownerOf(claimId)` is queried at redemption time.
- No buyer wallet address is hardcoded into payout storage.
- Alice remains principal beneficiary regardless of revenue claim transfer.

### US-05: Simulate reward accrual and finalize

**As the authorized test reward-source operator**, I can fund a payout for a purchased offer using real configured ERC-20 token balances, then finalize exactly once after the mock epoch ends.

Acceptance:

- `MockRewardSource` has explicit operator authorization and a visible `MOCK` designation.
- Operator supplies funds to the source with an actual token transfer, not a fake API balance.
- Source records the amount per offer and can transfer only the recorded reward once.
- `finalizeOffer` checks `block.timestamp >= epochEnd`, purchased claim exists, and settlement has not happened.
- Finalize pulls the funded reward from `MockRewardSource` into the market custody, records `rewardAmount`, and emits an event.
- `0` is a permitted final reward, including when no funds were queued.
- Unauthorized callers cannot forge reward amounts.

### US-06: Redeem actual reward amount

**As the current claim holder**, I can redeem the settled payout exactly once.

Acceptance:

- Reject if not settled or caller is not claim owner/approved representative according to the chosen explicit authorization policy. Prefer owner only in Lite.
- Burn the claim NFT or irreversibly mark it redeemed **before** external token transfer.
- Transfer `rewardAmount` in the configured payout token to the owner.
- Record redemption event and final state, including `0` amount.
- A second attempt always fails.

### US-07: Return principal position

**As Alice**, I can retrieve the original mock NFT only after its mock lock expires **and** the purchased reward claim is fully settled and redeemed (or otherwise resolved).

Acceptance:

- Buyer and reward claim owner cannot call the withdrawal on their own behalf.
- Market returns the **original NFT token ID** to Alice.
- If offer never sold, Alice can cancel and retrieve NFT after the appropriate mock lock, without a phantom claim trapping it.
- Caller cannot change beneficiary.
- A second withdrawal fails.

---

## 4. Minimal architecture

```text
                      FRONTEND: Next.js + wagmi/viem
                       /                       \
             Alice seller screen          Bob buyer screen
                       \                       /
                        \                     /
                         v                   v
                   +------------------------------+
                   | EpochMarket.sol              |
                   |                              |
                   | Escrow MockVeBTC NFT         |
                   | List / Buy                   |
                   | Finalize / Redeem            |
                   | Return original mock NFT     |
                   +---------------+--------------+
                                   |
                         +---------+---------+
                         |                   |
                         v                   v
                 EpochClaim.sol      MockRewardSource.sol
                 ERC-721 claim      funded ERC-20 payouts
                         |                   |
                         +---------+---------+
                                   |
                     Testnet MUSD OR labeled demo ERC-20
```

**Key simplification:** Lite combines the long-term `PositionVault` and `EpochMarket` into one contract. The eventual protocol can separate them when real source adapters and multiple positions justify the additional surface area.

### Contracts to build

1. `MockVeBTC.sol`: ERC-721 position with fixed illustrative principal metadata and mock expiry.
2. `EpochClaim.sol`: ERC-721 token with controlled mint/burn by the market, `claimId -> offerId` mapping, and optional token URI metadata.
3. `MockRewardSource.sol`: operator-funded and offer-indexed payouts; one-time consumption; payout in configured ERC-20. Must never mint itself an amount of genuine MUSD.
4. `EpochMarket.sol`: source NFT escrow, fixed-price listing, atomic buy, reward finalization, redemption, principal return, and events.
5. **Only in fallback:** `EpochDemoUSD.sol`: explicitly named demo ERC-20 with test-only mint. Do not pretend it is actual MUSD.

Optional interfaces `IMockRewardSource.sol` and `IEpochClaim.sol` are fine. Avoid upgradeable proxies, permissionless source adapters, and admin-controlled principal seizure.

### Suggested repository tree

```text
epoch/
  README.md
  .env.example
  docs/
    PROTOCOL_SPEC.md
    LITE_SCOPE.md
    DEMO_SCRIPT.md
    INTEGRATION_GAPS.md
    SECURITY_NOTES.md
  contracts/
    src/
      EpochMarket.sol
      EpochClaim.sol
      MockVeBTC.sol
      MockRewardSource.sol
      EpochDemoUSD.sol              # optional fallback only
    test/
      EpochMarket.t.sol
      MockRewardSource.t.sol
      EpochInvariants.t.sol
    script/
      Deploy.s.sol
      SeedDemo.s.sol
    foundry.toml
  web/
    app/
      page.tsx
      offers/[id]/page.tsx
      position/page.tsx
      demo/page.tsx
    components/
      ConnectWallet.tsx
      ModeBanner.tsx
      PositionCard.tsx
      OfferCard.tsx
      ClaimCard.tsx
      TransactionTimeline.tsx
    lib/
      contracts.ts
      chain.ts
      readOffers.ts
      formatUnits.ts
  deployments/
    mezo-testnet.json
  assets/
    demo-video.mp4               # optional
```

---

## 5. State machine and transition guards

An offer is the durable unit of accounting. The claim token is only issued on purchase.

```text
                   createOffer
                       |
                       v
                     LISTED
                     /    \
             cancel /      \ buy (before epoch start)
                   v        v
               CANCELLED   SOLD
                   |         |
     mock lock ends|         | epoch ends, finalize
                   |         v
                   |       SETTLED
                   |         |
                   |         | claim owner redeems
                   |         v
                   |       REDEEMED
                   |         |
                   +-------> | mock lock expired
                             v
                           CLOSED
```

- **LISTED:** NFT escrowed; no buyer; seller may cancel before purchase.
- **CANCELLED:** offer untradable; seller reclaims escrowed NFT after lock constraints.
- **SOLD:** seller paid and claim NFT belongs to buyer/current holder.
- **SETTLED:** actual source transfer finalized, including zero payout. No extra funding can increase payout.
- **REDEEMED:** claim has been burned or permanently marked redeemed.
- **CLOSED:** mock underlying principal NFT returned to immutable seller; no rewards or position rights remain in the market.

To avoid unbounded custody in the eventual protocol, define a documented resolution path for lost claim owners or unclaimed small rewards. **For Lite, do not silently reclaim buyer rewards or unilaterally close a sold but unredeemed claim.** The seller may remain unable to withdraw until the buyer redeems. Make this limitation explicit in the README and tests.

### Time rules

- The **real Mezo epoch is seven days** starting Thursday at 00:00 UTC.
- The **Lite mock epoch is independently configured** (for example 120 seconds on the testnet); the UI must say `SIMULATED 2-MINUTE EPOCH`.
- An offer must be listed and bought before `epochStart`.
- Settlement occurs only at or after `epochEnd`.
- Mock position unlock time must be at least `epochEnd`.
- Local Foundry tests may warp timestamps; **a Mezo testnet explorer trace cannot use simulated chain timestamps or Foundry warp**.
- No administrative `forceSettleEarly` or `fastForward` entry point in deployed market contracts.

---

## 6. Solidity API specification

The following signatures are indicative, not a compiled ABI. An implementation can adjust for Solidity structs and gas efficiency while preserving semantics.

### `EpochMarket.sol`

```solidity
struct Offer {
    address seller;             // immutable principal beneficiary
    address sourceNft;          // MockVeBTC in Lite
    uint256 sourceTokenId;
    address quoteToken;         // official testnet MUSD, or disclosed demo token
    address payoutToken;        // same ERC-20 in Lite to simplify proof
    uint256 price;
    uint64 epochStart;
    uint64 epochEnd;
    uint64 principalUnlock;
    uint256 claimId;            // zero before purchased, otherwise minted ID
    uint256 realizedReward;     // valid after settlement; zero is allowed
    OfferStatus status;
}

function createOffer(
    uint256 sourceTokenId,
    uint64 epochStart,
    uint64 epochEnd,
    uint256 price
) external returns (uint256 offerId);

function cancelOffer(uint256 offerId) external;
function buyOffer(uint256 offerId) external;
function finalizeOffer(uint256 offerId) external;
function redeem(uint256 offerId) external;
function withdrawPrincipal(uint256 offerId) external;
function getOffer(uint256 offerId) external view returns (Offer memory);
```

Implementation notes:

- `sourceNft`, `quoteToken`, `payoutToken`, `rewardSource`, and `claim` may be immutable constructor parameters for Lite.
- Reject price `0` in normal sale flow.
- Use checks-effects-interactions and `ReentrancyGuard` on transfer-facing paths.
- Use OpenZeppelin ERC-721 receiver handling and `SafeERC20`.
- Assert beneficiary is nonzero and immutable, and `epochStart < epochEnd <= principalUnlock`.
- Require `sourceNft.ownerOf(sourceTokenId) == msg.sender` before escrowing.
- Use `safeTransferFrom` and correctly implement `onERC721Received`; reject unsolicited unrelated NFTs where possible.
- Do not trust frontend-derived status or balances for transition decisions.
- Reconcile actual ERC-20 inflow at settlement; `rewardAmount` must correspond to funds delivered by the source, not a free-form operator return value without backing.
- `withdrawPrincipal` must send directly to `seller`, never arbitrary caller-supplied recipient.

### `EpochClaim.sol`

```solidity
function mint(address to, uint256 offerId) external returns (uint256 claimId);
function burn(uint256 claimId) external;
function offerOf(uint256 claimId) external view returns (uint256 offerId);
```

- Mint/burn callable only by `EpochMarket`.
- Use `ownerOf` at the instant of redemption; apply token transfer restrictions only if justified and disclosed.
- Claim token is **not** a right to underlying BTC and metadata must state this.

### `MockRewardSource.sol`

```solidity
function fundOffer(uint256 offerId, uint256 amount) external;
function claimToMarket(uint256 offerId) external returns (uint256 amount);
function fundedAmount(uint256 offerId) external view returns (uint256);
```

- `fundOffer` is callable by the designated test operator only; uses `transferFrom` to move actual ERC-20 tokens into source custody.
- `claimToMarket` is callable only by the designated market contract and only once per offer; transfers the recorded balance to it.
- The source **does not represent real Mezo fees**. It is a controlled onchain simulator with token-backed payouts.
- Do not expose a method that lets an arbitrary caller overwrite an already recorded reward or drain other offers.

### Events (minimum)

```solidity
event OfferCreated(uint256 indexed offerId, address indexed seller,
                   uint256 indexed sourceTokenId, uint256 price,
                   uint64 epochStart, uint64 epochEnd);
event OfferCancelled(uint256 indexed offerId);
event OfferPurchased(uint256 indexed offerId, uint256 indexed claimId,
                     address indexed buyer, uint256 price);
event RewardFunded(uint256 indexed offerId, uint256 amount);
event OfferSettled(uint256 indexed offerId, uint256 rewardAmount);
event RewardRedeemed(uint256 indexed offerId, address indexed redeemer,
                     uint256 amount);
event PrincipalWithdrawn(uint256 indexed offerId, address indexed seller,
                         uint256 sourceTokenId);
```

Use events to drive the UI activity timeline; a third party must be able to reconstruct the transaction sequence without knowing your database.

---

## 7. Frontend and presentation specification

### Visual hierarchy

Use a polished but restrained dark-on-light or dark financial-dashboard aesthetic. Avoid invented live APRs. Every screen has two separate labels:

1. **Execution mode:** `Mezo Testnet` or `Local Anvil`.
2. **Economic mode:** `Simulated reward source and BTC position` and `Official testnet MUSD` **or** `Demo ERC-20`.

### Screen A: landing and offer marketplace

Above fold:

- Headline: **Sell future Bitcoin revenue without selling the principal.**
- Subtitle: **A proof of future fee rights on Mezo. Current version uses a simulated reward source.**
- Three-step strip: `Escrow position → Buy epoch claim with MUSD → Redeem realized rewards`.
- One featured offer with epoch countdown, seller, price, quote token, target payout token, and `SIMULATED` badge.
- Transaction explorer links if already executed.

### Screen B: seller position / create offer

Fields:

- Source position NFT + token ID.
- Display `0.10 BTC (illustrative only)`.
- Source lock/unlock time and simulated epoch window.
- Ask price in configured ERC-20, for example `8 MUSD`.
- Reward entitlement summary `100% of eligible payouts from mock source for one epoch`.
- Read-only beneficiary `Alice wallet`.
- `Approve NFT`, then `Create Offer`.

### Screen C: offer details and purchase

- Fixed-price listing and source metadata.
- Risk line: `Reward can be zero. Buyer never owns principal. Mock source is controlled.`
- Approval amount and purchaser balance.
- `Approve MUSD`, `Buy Claim` with clear transaction state.
- After purchase, display claim NFT ID, current holder, explorer link, and timestamp.

### Screen D: settlement and claim

- Explicit mock operator panel, visible only for designated demo wallet.
- Button `Fund simulated reward`, amount example `12 MUSD`.
- Button `Finalize simulated epoch` enabled only once `epochEnd` has passed.
- Buyer claim screen shows **real funded amount** from the market contract.
- `Redeem reward` executes payout to current claim NFT holder.
- Seller sees principal NFT withdrawal condition and transaction when available.

### UI state requirements

- Show chain mismatch, unconnected wallet, insufficient balance, missing ERC-20/NFT approval, transaction pending, reverted, success, and explorer link.
- All units formatted with actual onchain decimals.
- No absolute USD fiat claims without a sourced exchange rate; 8 MUSD is a token amount.
- Do not show a real Mezo APR for mock fees.
- Read-only link accessible without a connected wallet so judges can inspect completed offers.

---

## 8. Exact deterministic demonstration

Set up three testnet wallets:

- **Alice:** owns mock source NFT, seller and principal beneficiary.
- **Bob:** owns sufficient quote token and purchases claim.
- **Operator:** has sufficient quote/payout tokens to fund the mock source.

Optional **Carol** receives the claim as an extra transfer demonstration.

### Demo A: successful example, 8 paid and 12 realized

1. Show a new mock source NFT representing the illustrative 0.10 BTC position.
2. Alice approves `EpochMarket` to transfer that NFT.
3. Alice creates an offer for the next **simulated** epoch with price `8` in the configured ERC-20.
4. Verify market owns the source NFT, Alice is beneficiary, and status is `LISTED`.
5. Bob approves and buys; capture MUSD token transfer and mint event, status `SOLD`.
6. Optionally Bob transfers claim to Carol before redemption.
7. Operator deposits `12` payout tokens into `MockRewardSource` for this offer.
8. After the epoch boundary, anyone calls `finalizeOffer`; state becomes `SETTLED`.
9. Current claim NFT owner calls `redeem`; the owner receives `12`, NFT is burned or disabled, state becomes `REDEEMED`.
10. After mock lock expiry, Alice calls `withdrawPrincipal`; the same original mock NFT returns, state becomes `CLOSED`.
11. Display explorer links for `create`, `buy`, `fund`, `finalize`, `redeem`, and `withdraw`.

**Expected wallet/result table:**

| Participant | Demo change | Notes |
|---|---|---|
| Alice | `+8` quote tokens; original mock NFT returned at close | Forfeits period revenue |
| Bob/Carol | Pays `8` if Bob; current claim holder receives `12` payout tokens | Two distinct holders possible; no guaranteed profit |
| Operator | `-12` payout tokens | Artificially supplies payout; not from real Mezo revenue |
| Epoch | Takes no protocol fee | Keeps semantics simple |

### Demo B: zero reward

- Buyer pays fixed price.
- Operator funds `0`; finalization records `0` after end.
- Buyer redeems `0` without revert, claim is consumed, and Alice eventually withdraws mock principal.
- Clearly communicate that buyer loses the paid quote tokens.

### Demo C: failed attack / forbidden transaction

- Bob attempts `withdrawPrincipal` and transaction reverts.
- Alice attempts to cancel a sold claim and transaction reverts.
- Previous redeemer tries to redeem twice and transaction reverts.

### Video outline (90–150 seconds)

- 0–20s: problem and rights split.
- 20–45s: Alice escrows simulated position and lists one revenue epoch.
- 45–75s: Bob purchases with testnet MUSD or disclosed demo token; show explorer evidence.
- 75–105s: operator funds simulated fee; settlement and redemption.
- 105–130s: Alice recovers mock principal NFT; highlight no buyer claim to principal.
- Final 10–20s: actual integration work remaining and vision for real Mezo fee-forward markets.

**Never edit balances or status in the UI to simulate a transaction.** All showcased state changes must come from the smart contracts.

---

## 9. Contract tests and invariants

Use Foundry. At minimum, the following tests must pass before any testnet demo:

| ID | Test | Expected result |
|---|---|---|
| T01 | Seller creates offer with owned approved NFT | Escrow succeeds and `LISTED` |
| T02 | Seller does not own NFT | Revert |
| T03 | Create for past or malformed epoch | Revert |
| T04 | Create with zero price | Revert |
| T05 | Duplicate active offer / overlapping rights | Revert |
| T06 | Insufficient quote allowance/balance | Atomic revert, NFT ownership unchanged |
| T07 | Buyer purchases before epoch start | Seller paid, buyer claim minted |
| T08 | Two buyers attempt same purchase | Exactly one succeeds |
| T09 | Seller cancels after sale | Revert |
| T10 | Buyer purchases after epoch starts | Revert |
| T11 | Operator funds source with 12 payout units | Contract balance and accounting both increase |
| T12 | Non-operator attempts to fund/overwrite reward | Revert under chosen access policy |
| T13 | Finalize before end | Revert |
| T14 | Finalize twice | Revert |
| T15 | Settle and redeem 0 reward | Valid, final, exact zero payout |
| T16 | Settle and redeem positive reward | Correct ERC-20 transfer to current claim owner |
| T17 | Transfer claim from Bob to Carol before redemption | Only Carol can redeem |
| T18 | Unauthorized redeemer calls redeem | Revert |
| T19 | Redeem twice | Revert |
| T20 | Buyer calls principal withdrawal | Revert |
| T21 | Seller tries to withdraw before lock/settlement | Revert |
| T22 | Original depositor withdraws after redemption and expiry | Exact original NFT returned |
| T23 | Cancel unpurchased offer and reclaim after lock | Successful, no phantom claim |
| T24 | Extraneous ERC-20 donation to market | Does not inflate recognized per-offer rewards |
| T25 | Reentrancy attempt through malicious token/NFT receiver | No double redemption or double withdrawal |

### Property-based checks

- For any source token ID, at most one active escrow obligation.
- `principalBeneficiary(offer)` never changes.
- `totalPaidToSeller = sum(successfulOfferPrices)` for executed offers, ignoring gas.
- `totalRewardRedeemed <= totalRewardFinalized`, per offer/token.
- Every sold offer has at most one claim and each claim references exactly one offer.
- A claim buyer cannot gain underlying position custody through any publicly callable action.
- State transitions never go backwards.

`forge test -vvv` must succeed. Capture a clean test summary for the submission, but do not fabricate test counts or gas benchmarks before running.

---

## 10. Work packages for Codex / agents

### WP0: Repository and contract environment

**Files:** Foundry project, package scripts, `.env.example`, testnet configuration, OpenZeppelin dependency.

**Output:** deterministic local deployment and successful test transaction on Anvil.

**Complete when:** `forge build` and a basic token/NFT deployment smoke test pass.

### WP1: Core rights separation

**Files:** `MockVeBTC.sol`, `EpochClaim.sol`, `EpochMarket.sol`.

**Output:** source NFT escrow, listing, ERC-20 price payment, minted claim, cancellation path, immutable principal beneficiary.

**Complete when:** T01–T10 plus principal property tests pass.

### WP2: Mock source settlement

**Files:** `MockRewardSource.sol`, settlement/redeem transitions, relevant tests.

**Output:** funded rewards, deterministic finalization, redeem-in-kind, zero reward support, and principal return.

**Complete when:** T11–T25 and property checks pass.

### WP3: Testnet deployment

**Files:** `Deploy.s.sol`, `SeedDemo.s.sol`, `deployments/mezo-testnet.json`.

**Output:** explorer-verifiable deployment; configured payment token; three wallet seed flow.

**Complete when:** contract addresses and every relevant transaction hash appear in README or manifest. Verify from chain, not assumed receipts.

### WP4: Frontend

**Files:** Next.js UI, wallet connection, contract ABI generation/use, state reads/writes and activity list.

**Output:** no offchain settlement authority; complete Alice/Bob journey.

**Complete when:** the UI can execute the same events as the deployed contract and handles common failures.

### WP5: Submission and verification

**Files:** `README.md`, `DEMO_SCRIPT.md`, demo video, tests, provenance and risks.

**Output:** one link to UI, public repo, testnet deployments, 2-minute narrated demonstration, short scope and explicit mock disclaimer.

**Complete when:** a new reviewer can reproduce the flow using the published instructions.

### Coding agent acceptance protocol

For each work package, require the agent to return:

1. Actual files changed and contract/API changes.
2. Commands run and their real output summary.
3. Addresses/hashes **only if deployed and verified**.
4. Unresolved bugs and assumptions, not silent omissions.
5. A short mapping from acceptance tests to observed passing results.

Do not authorize the agent to deploy to mainnet or use real BTC. Store private keys in ignored environment files, never in source control, videos, or logs.

---

## 11. Environment, deployment and reproducibility

Suggested tools:

- Solidity `^0.8.24` or another compatible stable compiler version selected at initialization.
- Foundry `forge`, `cast`, and `anvil`.
- OpenZeppelin contracts for ERC-721, `SafeERC20`, `ReentrancyGuard`, and access control.
- Next.js with TypeScript, wagmi + viem, and a wallet provider.
- Minimal CSS/design system; no mandatory backend, ORM, Docker cluster, indexing SaaS, or AI agent.

Example `.env.example`:

```dotenv
MEZO_TESTNET_RPC_URL=https://rpc.test.mezo.org
MEZO_TESTNET_CHAIN_ID=31611
PAYMENT_MODE=REAL_TESTNET_MUSD
MUSD_TESTNET_ADDRESS=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503
# DEPLOYER_PRIVATE_KEY=            # set locally only; never commit
# OPERATOR_PRIVATE_KEY=            # test wallet only; never commit
NEXT_PUBLIC_EPOCH_MARKET_ADDRESS=
NEXT_PUBLIC_EPOCH_CLAIM_ADDRESS=
NEXT_PUBLIC_MOCK_SOURCE_ADDRESS=
NEXT_PUBLIC_MOCK_VEBTC_ADDRESS=
NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS=
NEXT_PUBLIC_REWARD_TOKEN_ADDRESS=
NEXT_PUBLIC_ECONOMIC_MODE=SIMULATED_REWARDS
```

The repo should expose a human-readable `deployments/mezo-testnet.json` with verified chain ID, token addresses, contract addresses, block numbers, transaction hashes, and deployment timestamp. Leave unknown values absent until a transaction succeeds.

### Deployment sequence

1. Local: `forge install`, compile, run all tests, run Anvil scenario.
2. Inspect chain ID, payment token `decimals()`, code existence, and balances.
3. Deploy mock position NFT and market dependencies.
4. Deploy source and claim contracts; wire market-only roles correctly.
5. Persist verified addresses and regenerate frontend ABI bindings.
6. Mint demo mock NFT, create sale fixture, and pre-fund test operator.
7. Execute full transaction cycle with separate seller and buyer wallets.
8. Verify events/balances from RPC and explorer.
9. Film a fresh run or replay verified testnet transaction history.

The chain may not provide testnet MUSD conveniently; the fallback is explicitly documented and must not be hidden.

---

## 12. README and hackathon submission template

### One-line description

**Epoch Lite demonstrates the transfer of a future reward claim independently from a Bitcoin-backed principal position, with fixed-price token settlement on Mezo testnet.**

### Public product description

Epoch is an experimental market for future protocol cash flows. In Epoch Lite, a holder escrows a **simulated** BTC-backed position NFT and sells one simulated epoch of future rewards for testnet MUSD, or for an explicitly disclosed demo token when testnet MUSD is unavailable. The buyer receives a transferable claim NFT and can redeem the amount actually provided by the onchain mock rewards contract. The original depositor retains the right to the mock principal position.

### Evidence to provide

- Public GitHub repository with README and clear setup.
- Testnet explorer links for the market, claim, mock position, reward source, and transactions.
- Contract test outputs and honest descriptions of what passed.
- A live URL or demo video, if available.
- A Mezo-specific architecture diagram and source links.
- A clear separation of **implemented**, **simulated**, **assumed**, and **planned**.

### Must-disclose limitations

- No real BTC deposits or live veBTC custody.
- No live Mezo fee collection, no reliable prediction of rewards.
- Sample `8` and `12` amounts are synthetic demonstration values.
- No production audit, insurance, or promised returns.
- No auction or secondary exchange beyond basic NFT transfers.
- No demonstrated claim on real veBTC epochs until adapter integration is proven.

**Avoid hackathon overclaiming:** Do not call Epoch Lite a fully operational Bitcoin yield market or a capital-protected product.

---

## 13. Security and integration follow-up

### Specific Mezo risk

Mezo disclosed that veBTC was exploited on 5 October 2026; its report says 37 positions across 36 holders, about 5.52 BTC, were affected, and that the exploited vulnerability was patched on 6 October. Epoch must not rely on that patch as a substitute for its own audits and adapter review.

### Real-source integration checklist, NOT part of Lite

- [ ] Verify official target `VeBTC` address, deployed bytecode and current ABI.
- [ ] Confirm ERC-721 transfers into/out of a smart contract are permitted and behave correctly.
- [ ] Confirm smart contract custody permits reward claims and voting, including after ownership transfers.
- [ ] Identify each distributor call, reward token type, and epoch indexing semantics.
- [ ] Prove per-epoch fee isolation without including old or future rewards.
- [ ] Prove votes and boost choices cannot be changed to undermine sold rights.
- [ ] Identify NFT expiration, withdrawal, burn, and claim interactions.
- [ ] Run realistic end-to-end integration tests over an actual Mezo epoch.
- [ ] Security review including reentrancy, native BTC receiving, delegated actions, trusted forwarders, and function selector/library edge cases.
- [ ] Independent review and explicit consent before any real BTC position is accepted.

### Product gates after hackathon

1. **Feasibility:** real reward adapter works reproducibly.
2. **Materiality:** actual claim size covers transaction and market friction.
3. **Demand:** at least some independent buyers agree to purchase claims with no artificial incentive.
4. **Safety:** custody and cross-epoch accounting pass independent review.

---

## 14. Final definition of complete / incomplete

### Mark as COMPLETE only when

- End-to-end onchain demo is repeatable with two independent wallets.
- All must-have tests pass, and there is no known principal-theft path in mock contracts.
- Funds displayed to users reflect actual ERC-20 balances and transactions on chosen network.
- All mock inputs and limitations are prominently disclosed.
- Public repo includes reproduction instructions and chain references.
- Demo ends with reward claimant receiving rewards and original depositor receiving original mock principal NFT.

### Mark as PARTIAL, but submit truthfully, when

- Contracts pass locally but testnet token funding is unavailable.
- UI displays contract state but cannot yet write transactions.
- Market purchase works but mock settlement or principal return needs fixing.
- Explorer verification or documentation is incomplete.

### Never claim complete if

- Transaction balances are manually simulated in React state.
- Buyer can seize principal or seller can revoke a sold entitlement.
- Claim ownership does not control who receives rewards.
- Testnet demo token is described as official MUSD.
- Mock reward source is represented as a real Mezo revenue distribution.

---

## 15. Exact handoff prompt for a coding agent

Copy this instruction into your preferred coding agent alongside `EPOCH_PROTOCOL_SPEC.md` and this file:

> Build **Epoch Lite** exactly to `EPOCH_LITE_SCOPE.md`, prioritizing the minimal escrowed mock NFT + fixed-price ERC-20 claim sale + funded mock reward settlement + current NFT-owner redemption + original depositor principal return. Use Solidity/Foundry and a Next.js TypeScript frontend with wagmi/viem. Keep all status and balances grounded in chain state. Begin with local tests and only then deploy to Mezo testnet (chain ID 31611). Prefer the official testnet MUSD contract if usable; otherwise deploy an obviously named demo ERC-20 and disclose fallback everywhere. Do not integrate real BTC or real veBTC for this version. Do not invent deployed addresses or test results. Implement all mandatory guards and test cases in the spec, maintain a concise progress log in the README, and give a reproducible final setup with ABI addresses and explorer links. Do not deploy to mainnet.

---

## 16. Authoritative reference links

- Mezo testnet developer guide: https://testnet.mezo.org/docs/developers/getting-started/
- Official Mezo contracts reference: https://mezo.org/docs/users/resources/contracts-reference
- Mezo testnet governance references: https://mezo.org/docs/developers/features/mezo-pools
- Mezo veBTC epochs and lock behavior: https://testnet.mezo.org/docs/users/mezo-earn/lock/vebtc/
- Mezo fee token behaviors: https://mezo.org/docs/users/mezo-earn/vote/earning-and-managing-your-position/
- Mezo security incident: https://mezo.org/blog/incident-report-october-5-2026/
- ERC-721 / ERC-1155 / ERC-4626 background: https://ethereum.org/developers/docs/standards
- Original current buildathon products page (client-rendered, not completely inspectable through the accessible text page): https://app.akindo.io/wave-hacks/OVOO0gdrVU8379D10?tab=products

**Research note:** The complete inventory of other entries on the client-rendered AKINDO page could not be verified using its accessible HTML. Do not assert that Epoch is unique among all submitted projects until a direct manual review is completed.
