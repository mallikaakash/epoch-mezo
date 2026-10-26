# EPOCH
## Protocol Idea Specification: Markets for Future Bitcoin-Native Revenue

**Version:** 0.1 (research and architecture draft)  
**Date:** 26 October 2026  
**Status:** Concept specification, not an audited protocol  
**Initial ecosystem:** Mezo, with MUSD as settlement and quote asset  
**Long-term category:** Onchain cash-flow derivatives and forward markets

> **One-sentence thesis:** Epoch enables a holder of a Bitcoin-backed, revenue-generating position to sell a precisely defined slice of future onchain rewards for MUSD today, while retaining the economic right to recover the underlying principal.

> **Accuracy boundary:** The core derivative design below is proposed, not an existing Mezo feature. Actual veBTC integration, per-epoch accounting, voting restrictions, reward token behavior, and permission-to-claim interfaces must be validated against verified contract ABIs and onchain behavior. No yield, redemption amount, or secondary market is guaranteed.

---

## 1. Executive summary

Bitcoin holders increasingly have productive onchain positions, but the reward stream is generally inseparable from the position that earns it. A veBTC holder can lock BTC, vote, and earn a share of network and gauge fees. However, holding a productive position until rewards are realized is not the only possible way to use it.

**Epoch is a marketplace for dated revenue rights.** The depositor escrows an eligible position in a purpose-built vault, defines a claim on one future reward period, and sells that claim for a fixed MUSD payment or, later, through price discovery. The buyer acquires the entitlement to **actual** rewards for the agreed source, token, and period. The original depositor retains the right to withdraw the original principal after the lock expires and contractual reward obligations have been settled.

This creates two independent economic exposures:

1. **Principal exposure:** ownership and future return of BTC locked in the underlying position.
2. **Revenue exposure:** entitlement to fees that may be produced by the position in specified future epochs.

The initial implementation should not borrow MUSD, hypothecate BTC, create an interest-bearing token, promise principal protection, or market returns as fixed. It is a **prepaid variable-revenue forward**, not a lending product.

### Product promise

- BTC holder: obtain MUSD upfront against future reward rights, without selling the BTC principal or incurring a new MUSD debt.
- Buyer: acquire exposure to future Mezo revenue without first locking an equivalent BTC position.
- Ecosystem: discover market prices for fee streams associated with specific epochs, gauges, or protocols.

### Critical feasibility question

Can a contract that legitimately controls a veBTC NFT isolate and claim the relevant per-epoch rewards, while ensuring the depositor cannot reclaim or redirect those sold rewards? **The answer is not yet verified.** A safe demonstration uses an explicitly simulated reward source until this is validated.

---

## 2. Why this problem exists

### 2.1 Fragmented economic rights

A productive token or NFT often packages together control of principal, governance/voting, and fee entitlements. The holder may want near-term liquidity while maintaining a long BTC thesis, but transferring the whole position also transfers principal rights.

### 2.2 Financial choices today

| Choice | Liquidity today | Retains BTC principal exposure | Principal risk or debt implication |
|---|---:|---:|---|
| Sell BTC | Yes | No | BTC upside exposure sold |
| Borrow MUSD against BTC | Yes | Yes, subject to collateralization | Creates debt and liquidation exposure |
| Hold veBTC and wait for fees | No, until fees accrue | Yes | No extra debt; rewards uncertain |
| Sell a dated future fee claim through Epoch | Yes, if a buyer exists | Yes, subject to contract and custody risk | Future income surrendered; no new debt |

Epoch is not always superior to borrowing. The BTC holder gives up uncertain upside from fee income and adds smart-contract risk. Liquidity depends on counterparty demand.

### 2.3 Why Mezo

Mezo is a Bitcoin-centric EVM-compatible chain with the MUSD stablecoin and an epoch-based fee and voting system. Mezo documentation describes veBTC as an ERC-721 representation of locked BTC. Locks are between 1 and 28 days, voting weight decays, and epochs run Thursday-to-Thursday at 00:00 UTC. Network fees can be passive; gauge-related trading fees or incentives depend on voting and may be paid in multiple tokens.

These attributes provide the raw ingredients for **short-dated, verifiable fee-forward markets**, but they also constrain initial market size and make reward-source selection materially important.

---

## 3. Users and jobs to be done

### Persona A: BTC position holder / revenue seller

- Holds veBTC or another eligible revenue-generating BTC position.
- Wants MUSD liquidity now without closing the BTC position or borrowing.
- May be willing to sell uncertain fee upside at an agreed price.
- Needs certainty that sold rewards cannot cause the BTC principal to be seized by the buyer.

### Persona B: revenue trader / fee buyer

- Expects future trading, bridging, or other fees to exceed the purchase price.
- Wants exposure to network activity instead of BTC price appreciation alone.
- Can tolerate low or zero future rewards and loss of the upfront price.
- Needs precise claim metadata and independently auditable settlement.

### Persona C: allocator / researcher / market maker (later)

- Compares fee claims across epochs and protocols.
- Builds a term structure, hedges fee exposure, or supplies bids.
- Needs consistent historical data and transfer rules.

### Non-target users for the initial product

- Businesses requiring KYC, invoice validation, or offchain collections.
- Users seeking guaranteed fixed returns.
- Users needing immediate liquidity with no buyer on the other side.
- Users unfamiliar with variable-return derivatives or escrow risks.

---

## 4. Core instrument and rights model

### 4.1 Definitions

| Term | Definition |
|---|---|
| Source position | The underlying veBTC NFT or supported revenue-generating position. |
| Position vault | Contract that escrows the NFT, owns or controls claim operations, and preserves principal return rights. |
| Principal beneficiary | Original depositor entitled to recover the position or underlying BTC after eligible settlement and expiration. |
| Revenue claim | Transferable token granting the current holder the actual eligible reward for an identified epoch and reward token. |
| Reward source | Precisely selected distributor/gauge/revenue route, not simply generic APY. |
| Epoch | Mezo weekly accounting period, or a transparently shortened simulated period in the Lite demo. |
| Quote asset | MUSD paid by the revenue buyer to the seller. |
| Payout asset | Actual reward token transferred on redemption; not necessarily MUSD. |
| Settlement | Finalization of the actual reward amount and making that amount redeemable by claim holder. |

### 4.2 Unique claim identity

For each claim, bind an immutable tuple:

`(chainId, sourcePositionContract, positionTokenId, rewardSource, rewardToken, epochId, vaultId)`

One tuple may have **at most one 100% claim** in the first version. Later fractional series require strict supply caps and pro-rata accounting.

### 4.3 What the seller retains

- A recorded, non-transferable **principal beneficiary** right in version 1.
- Ability to retrieve the escrowed position after its lock permits withdrawal and all sold rewards have been safely settled or otherwise reserved.
- No power to cancel a completed sale or change entitlement for the sold period.

### 4.4 What the buyer receives

- An ERC-721 revenue claim for one defined epoch and one reward token/source.
- Transferability before redemption, subject to general ERC-721 mechanics.
- Sole right to withdraw that epoch's actual recognized reward allocated to the claim.
- **No ownership of underlying BTC, voting powers, or principal withdrawal.**

### 4.5 Voting and source constraints

Voting selection can directly affect revenue. Therefore, once a claim is listed or sold, source selection and permitted votes must be fixed for its covered period. If the real protocol does not permit sufficiently enforceable restrictions through escrow or adapter calls, that reward source is **not eligible** for Epoch production use.

The safest first live integration may be a passive fee stream requiring no voting. This is a research hypothesis, not a confirmed implementation path.

---

## 5. Economic mechanism

### 5.1 Primary transaction

1. Alice holds a valid locked BTC position represented by an NFT.
2. Alice deposits the NFT into a vault; the vault records Alice as principal beneficiary.
3. Alice lists the right to reward asset `T` from source `S` for epoch `E`, asking `P` MUSD.
4. Bob purchases the claim **before the covered epoch begins**. A single atomic transaction transfers `P` MUSD to Alice and transfers the claim NFT to Bob.
5. The vault retains control of the underlying position during the covered period.
6. After epoch `E`, the reward adapter collects or measures actual eligible rewards `R_T` in token `T`.
7. Bob, or the new claim owner if Bob transferred the NFT, redeems `R_T` tokens.
8. Once the underlying lock expires and pending claims are fully accounted for, Alice recovers her principal position, or has the vault perform the approved withdrawal into her beneficiary wallet.

**No reward is promised.** If `R_T = 0`, the claim pays zero and Bob does not automatically receive a refund. If `R_T` is very large, Bob owns the agreed 100% entitlement for that epoch unless an explicit cap was agreed beforehand.

### 5.2 Example with clearly illustrative values

- Underlying position: mock representation of 0.10 BTC locked.
- Forward price: `P = 8 MUSD`.
- Epoch ends; actual sample reward (for the example): `R = 12 MUSD`.
- Alice receives 8 MUSD immediately and forgoes the 12 MUSD sample fee.
- Bob receives 12 MUSD at settlement and has a gross 4 MUSD gain, excluding transaction costs and any other costs.

A second sample where the reward is only 3 MUSD yields a gross 5 MUSD loss for Bob. Both cases belong in the demonstration or tests. These are **fictional examples**, not a forecast for a 0.10 BTC position.

### 5.3 Pricing and fee discovery

If buyers expect uncertain rewards `R_T`, a simplified market valuation is:

`P_MUSD ≈ E[spot_MUSD(T at payout) × R_T] / (1 + risk_discount)`

This expression is illustrative, not a pricing model. In practice, discounting, cash-flow covariance with BTC and MUSD, gas costs, settlement delays, information asymmetry, and liquidity matter. A production market should avoid publishing a misleading APY computed from one short period.

### 5.4 Protocol monetization hypothesis

- Phase 1: zero trading fees to establish behavior and validate usefulness.
- Phase 2: transparent, low listing-execution fee charged in MUSD **only on completed trades**, subject to governance and security review.
- Phase 3: optional analytics, data subscriptions, or market-making tooling.

No protocol token is needed to validate product-market fit.

---

## 6. Architecture

```text
Alice wallet                               Bob wallet
   |                                           |
   | deposit source NFT                         | pay MUSD
   v                                           v
+---------------------------+      +--------------------------+
| PositionVault             |<---->| EpochMarket              |
| - escrow original NFT     |      | - fixed price / auction  |
| - principal beneficiary   |      | - atomic MUSD settlement |
| - source/vote restrictions|      +--------------------------+
| - reward collection       |                    |
+-------------+-------------+                    v
              |                       +-----------------------+
              +---------------------->| RevenueClaim ERC-721 |
              |                       | - unique dated right  |
              v                       +-----------+-----------+
+---------------------------+                     |
| IRewardSourceAdapter      |                     v
| - source authentication   |             Claim holder redeem
| - measured rewards        |                     |
| - per-epoch settlement    |                     v
+-------------+-------------+             Real reward token T
              |
      Mezo fee or gauge source
```

### 6.1 Component roles

**PositionVault:** position custody, immutable beneficiary and source binding, state transitions, and principal return. Has no authority to transfer principal to a claim buyer.

**EpochMarket:** listing state and atomic ERC-20 MUSD purchase. Payment never depends on an administrator attesting that a reward happened.

**RevenueClaim:** transferable token mapping claim ID to exactly one claim tuple. Current owner at redemption determines the recipient.

**RewardAdapter interface:** bridge between a source-specific reward distributor and the generic Epoch contract. Each adapter must document who may call claim, beneficiary mechanics, reward currency, period boundary, and how to prevent claiming earlier or later rewards under the wrong epoch.

**Indexer/UI:** reconstruct events, show wallets and state, link explorer transactions. Indexer is not an authority for determining payouts.

### 6.2 Temporal accounting

The key difficulty is not token minting: it is proving how many reward tokens belong to epoch `E`, particularly when a distributor lets users claim multiple epochs together.

An adapter must either:

1. Claim separately by epoch through a verified source function; or
2. Use a proven cumulative-per-epoch index with immutable checkpoints and no reward leakage across epochs.

A naive `balanceAfter - balanceBefore` around a bulk claim is insufficient if other epochs or unrelated incentives can enter the contract at the same time.

### 6.3 Reward currency

Actual Mezo rewards may include BTC, MUSD, and pool or incentive tokens. Epoch version 1 should settle **in kind** in a single whitelisted ERC-20 asset. BTC-native and mixed-reward support require separate adapters and careful accounting. The settlement asset shown on a claim must never silently differ from the delivered token.

MUSD remains the buyer-to-seller currency. Automatic swapping into MUSD is a potential later feature with slippage protections, not a premise of the first version.

---

## 7. Technical and economic invariants

1. An underlying position can be in only one active vault at a time.
2. A claim is uniquely bound to one source, token, and epoch; two overlapping full claims cannot exist.
3. Claim buyers can never retrieve or transfer the underlying NFT or BTC principal.
4. Principal beneficiary cannot change after escrow in version 1.
5. A purchased claim cannot be cancelled by the seller.
6. A purchased claim cannot be bought again from the same listing.
7. Claim purchase, MUSD settlement, and ownership transfer must succeed or revert atomically.
8. A reward can be attributed and redeemed at most once.
9. A zero reward is a valid and final settled outcome.
10. A seller cannot modify sold-source votes or rewards if it would dilute a sold entitlement.
11. Principal exit is blocked until all sold claims are settled and the source lock permits recovery.
12. No administrative key can redirect buyer rewards or seize principal.
13. Unexpected tokens sent to the vault cannot be automatically classified as sale rewards.
14. Token amounts use exact decimals and safe transfer routines; no floating-point accounting onchain.
15. Contract events are sufficient to reconstruct a complete claim lifecycle.

---

## 8. Novelty and competitive positioning

**Do not claim invention of yield tokenization.** Pendle already separates principal and yield rights and provides markets for them. More general revenue derivatives, perpetual derivatives, and NFT marketplaces also exist.

The product thesis is narrower:

- **Discrete fee epochs rather than generic continuous yield:** each claim represents a specific accounting period.
- **Source-specific revenue:** trading fee pools, passive chain revenue, and incentives are separate exposures, not one undifferentiated APR.
- **Explicit principal-vs-revenue separation on Bitcoin-backed NFT positions:** claim holder never acquires principal redemption rights.
- **A possible protocol-revenue forward curve:** independently priced future fee periods could indicate market expectations for activity.
- **Verifiable distribution rather than promised cash flow:** payoff must come from an observed contract-defined revenue source.

The true differentiated moat, if the protocol grows, is trustworthy source adapters, robust epoch accounting, useful market data, and liquidity aggregation. Simply wrapping an NFT is not defensible.

### Related prior art and research orientation

- **Pendle:** established principal/yield separation; the primary comparison and strong prior art.
- **a16z crypto, _Blockchains create net new markets_ (29 Sep 2026):** mechanism framing: new markets can transfer existing exposures with new instruments.
- **Ethereum ERC-721 / ERC-1155 / ERC-7540:** representations for unique, grouped, and asynchronous claims.
- **Mezo Earn:** real revenue flow, short dated lock and weekly rewards.

These references inspire design, but do not demonstrate Epoch profitability or patent-level novelty.

---

## 9. Principal risks and mitigations

| Risk | Consequence | Design response |
|---|---|---|
| veBTC or adapter exploit | Principal or rewards lost | Mock-only prototype; isolated adapter; verified addresses and ABIs; independent audit before mainnet |
| Mis-attributed epochs | Buyer receives wrong rewards | Proven epoch accounting; formal invariants; reconciliation tests |
| Principal withdrawn early | Buyer has no enforceable source | Vault custody and withdrawal lock through final settlement |
| Seller changes gauges | Forward payout manipulated | Freeze eligible decisions in escrow; exclude non-freezable sources |
| Reward value too low | Buyer loses price | No guaranteed return; clear downside and historic data |
| Reward in different token | Wrong unit / payout assumption | Immutable payout token and whitelist; settle in kind |
| No secondary liquidity | Claim becomes hard to sell | Primary fixed-price RFQs first, no liquidity promises |
| Reward source ceases | Claim pays zero or becomes unclaimable | Explicit failure rules; bounded settlement window; per-adapter recovery procedure |
| Front-run or stale price | Seller gets poorer price | Seller-signed immutable order and expiry; atomic settlement |
| Collateral protocol changes | Claim adapter fails | Version adapters, change monitoring, migration under explicit consent |
| Legal classification / jurisdiction | Launch restricted | Obtain jurisdiction-specific advice before public mainnet market |

### Incident-specific safety note

On **5 October 2026**, Mezo reported an exploit of its veBTC implementation affecting **37 positions across 36 holders**, totaling approximately **5.52 BTC**. The team reported the vulnerability was fixed on 6 October and published a report on 7 October. This is materially relevant to any design escrowing veBTC. It does not prove all future integrations safe. No real user BTC should be accepted by Epoch without current contract verification and independent security review.

---

## 10. Product requirements for a mature protocol

### Seller journey

1. Connect wallet on a supported chain.
2. Inspect eligible revenue positions and current estimated fee sources.
3. See exact epoch, reward asset, fee source, lock expiration, and estimated upside/downside.
4. Escrow principal position and select legally enforceable source settings.
5. List future claim with specified MUSD price and order expiration.
6. Confirm buyer execution and received MUSD.
7. Monitor outstanding obligations and reclaim principal after unlock and settlement.

### Buyer journey

1. Discover available claims filtered by protocol, epoch, reward token, price, and status.
2. Read full claim rights and settlement rules.
3. Inspect historical realized fees and distinguish those from forecasts.
4. Purchase with MUSD and receive transferable claim NFT.
5. Watch accrued/settled rewards and redeem to wallet.
6. Export claim transactions and proof of final settlement.

### Data features

- Event-derived position registry and provenance.
- Reward source identification, paid token(s), historical epochs, and realized amounts.
- Fees in native units and separately labeled indicative MUSD values.
- Transaction and contract verification links.
- Optional market implied revenue expectations with confidence bands, only after sufficient samples.

---

## 11. Roadmap and decision gates

### Phase 0: Epoch Lite, proof of rights separation

Deliver a genuine testnet MUSD exchange against an escrowed **mock** NFT, transferable future-reward claim, deterministic simulated source settlement, and return of the position to the original beneficiary. Strictly label every simulated feature.

**Gate:** complete contracts and tests; independent wallet-to-wallet transaction trace.

### Phase 1: Live Mezo source feasibility

- Inspect official deployed veBTC and distributor ABIs/source.
- Prove escrow transfer, source votes, and reward claim compatibility on testnet.
- Establish a correct one-epoch, one-token payout adapter.
- Demonstrate reproducible reward accounting over a natural epoch.

**Gate:** claim exactly one real epoch without touching unrelated rewards or principal.

### Phase 2: Experimental fee market

- First whitelisted real source; conservative limits and disclosed risks.
- RFQ or sealed-bid auction rather than a bootstrapped AMM.
- Public data explorer and historical source statistics.

**Gate:** voluntary counterparties repeat transactions; fees cover execution costs; independent security review.

### Phase 3: Cross-position revenue market

- Multiple sources, rewards, and maturity dates.
- ERC-1155 series or fungible claims only where cash-flow rights truly match.
- More sophisticated forward curves, potential principal representation, and cross-chain adapters.

**Gate:** durable demand not primarily generated by rewards or hackathon incentives.

---

## 12. Success metrics and falsifiable hypotheses

| Hypothesis | Test | Failed if |
|---|---|---|
| Holders value upfront MUSD for future fees | Real RFQ acceptance and repeat sellers | No sellers at bids buyers will actually pay |
| Buyers want protocol revenue exposure | Repeat purchases without token incentives | Activity vanishes without subsidies |
| Claims can settle trustlessly | End-to-end epoch settlement with verified source | Admin discretion or offchain attestation required to allocate fees |
| Risk can be disclosed intelligibly | User comprehension interviews | Users mistake pricing examples for guaranteed yield |
| Cash flows are material | Reward-to-gas and reward-to-market cost ratio | Typical fee claims are economically too small |
| Market is extensible | Second independently auditable source adapter | Architecture depends on hardcoded special cases |

Potential objective metrics: unique buyer/seller wallets, gross MUSD traded, claims settled, claims with positive/zero payoff, average time to settlement, median gas cost, error/failure rate, concentration of trading activity, and fee-to-friction ratio.

---

## 13. What Epoch is not

- Not a lending market or invoice financing protocol.
- Not a BTC liquidation protection protocol.
- Not an autonomous trading agent.
- Not a promise of fixed interest, APY, or MUSD-denominated fees.
- Not a complete Pendle competitor in v1.
- Not permissionless for arbitrary reward streams unless an adapter can prove custody and accounting.
- Not audited, proven safe, or ready for real BTC deposits.

---

## 14. Open research questions, prioritized

**P0, blocks real-source integration**

1. Is the current official testnet veBTC contract safely transferable to an ERC-721 receiver vault, and can it be returned intact?
2. Are chain fee rewards attributed by token ID, owner address, or claim recipient? Can a smart contract owner claim correctly?
3. Can passive rewards from one epoch be separated from historical/unrelated rewards?
4. Do gauge rewards and passive chain fees use different claiming functions and asset types?
5. Can sold-period votes be enforced as immutable with the available interfaces?
6. What exactly happens to reward rights when the source NFT is transferred or burned after expiration?

**P1, blocks a meaningful open market**

7. Are the fee amounts per typical veBTC position large enough to justify trading and gas?
8. Which reward sources have predictable and sufficiently observable historical data?
9. What transaction ordering and order expiry mechanisms make forward sales fair?
10. How are claims priced when rewards are in BTC but quotes are in MUSD?

**P2, later protocol research**

11. Which revenue claims can be standardized/fungible, rather than NFT-specific?
12. Can source risk and default contingencies be underwritten without centralized guarantees?
13. Should the principal right become a transferable position NFT, and how is that made safe?
14. Does auction clearing outperform direct RFQ in short-maturity illiquid markets?

---

## 15. Source references and factual provenance

Verified public documentation used for the factual Mezo environment and comparable financial instruments:

1. Mezo veBTC overview: https://testnet.mezo.org/docs/users/mezo-earn/lock/vebtc/
2. Mezo earning and claiming rewards: https://mezo.org/docs/users/mezo-earn/vote/earning-and-managing-your-position/
3. Mezo contracts and token addresses: https://mezo.org/docs/users/resources/contracts-reference
4. Mezo developer Mezo Pools, governance contracts: https://mezo.org/docs/developers/features/mezo-pools
5. Mezo October 5, 2026 security incident: https://mezo.org/blog/incident-report-october-5-2026/
6. Pendle principal/yield prior art: https://docs.pendle.finance/pendle-academy/pendle-101/pendle-101-key-takeaways
7. a16z crypto, net new markets: https://www.a16zcrypto.com/posts/article/blockchains-create-net-new-markets
8. Ethereum token standards: https://ethereum.org/developers/docs/standards
9. Ethereum asynchronous claims: https://ercs.ethereum.org/ERCS/erc-7540

**Source limitations:** The linked AKINDO submissions tab is client-rendered; the accessible page did not expose a comprehensive competitor inventory. No claim of uniqueness relative to every currently submitted project is made. Contract behavior and addresses can change; an implementation must re-check its target chain before use.
