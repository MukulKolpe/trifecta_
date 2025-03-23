### DutchCross Protocol

This project integrates a Dutch auction mechanism with the ERC-7683 intent-based bridging framework to optimize solver selection for cross-chain transactions. The goal is to improve execution quality, reduce bridging costs, and increase solver capital efficiency by leveraging Real-Time Proving (RTP) on t1.

### Deployed Address - 

Dutch Auction Contract (t1 devnet) - https://explorer.v006.t1protocol.com/address/0xbF59f5a5931B9013A6d3724d0D3A2a0abafe3Afc
Esrow Contract - https://sepolia.etherscan.io/address/0x643af2c715f74f8d7003f5e7ba84e9f7a71de55f


### Problem Statement

While rollups have significantly scaled Ethereum’s throughput, they have also introduced liquidity fragmentation and broken composability. Current bridging mechanisms require solvers to front significant capital, leading to higher bridging costs for users. Additionally, order-matching systems rely on centralized relayers or leader-based mechanisms, which limit competition and execution efficiency.

### Solution: Dutch Auction for Optimal Solver Selection

To address these issues, we implement a Dutch auction mechanism to remove centralized relayers or leader-based mechanisms, which limit competition and execution efficiency. We also leverage t1 protocol which utilizes TEEs to generate Real-Time Proofs (RTP), verifying that solvers have fulfilled their obligations correctly. This ensures trustless execution, preventing malicious actors from manipulating the auction or settlement process. By integrating TEE-enabled proofs, 𝚝𝟷 eliminates the need for Optimistic settlement. In other words, 𝚝𝟷 can reduces the settlement time from several hours (the time required for humans to manually dispute incorrect bundles coming through) to a few minutes. This reduces the payment time to solvers and creates tremendous capital efficiency gains and vastly improves solver profitability. The general take-away is capital requirement and payment time is positively correlated, meaning if we cut payment time by half, we also reduce capital requirement by half. These improvements are transferred to the user in reduced bridging costs.

How It Works

1. Alice Deposits Funds on L1

- Alice initiates a cross-chain transaction by depositing funds into an escrow contract on the origin chain (L1 or a t1 partner rollup).

2. Auction is Run on t1(any l2 in future)

- A Dutch auction is initiated on t1, where solvers (bidders) compete to fill Alice’s order on t1 by bidding decreasing prices over time.

3. The first solver to accept the current price wins the auction.

4. Winner Fills Alice’s Order on t1

5. The winning solver transfers the required tokens to Alice on the destination chain (L2 or a rollup) and submits proof of settlement.

6. Settlement and Payout

- The winning solver calls the settle function on t1, providing proof that Alice has received funds on the destination chain.

- The escrow contract on L1 releases Alice’s deposited funds to the solver.

### Capital Efficiency Analysis

According to DeFiLlama (on February 12, 2025), Across facilitated ~$19.1mn bridging volume and 9507 bridge transactions in the last 24 hours on Ethereum, Optimism, and Arbitrum.

Assuming bridge TXs happen in uniformed intervals, we have 1 transaction approximately every 20 seconds on Ethereum and every 40 seconds on the rollups.

Assuming bridge TXs are equal in size, if a solver is paid every 60 minutes, they need to hold $800K in inventory across 3 chains.

If a solver is instead paid every minute, they only need to approximate $13,500 in inventory across 3 chains.

This represents a `60x improvement` in capital efficiency.

This enhancement reduces fees for users bridging funds, as the relayer incurs a lower opportunity cost for fronting the funds.

Source - https://defillama.com/, https://t1protocol.substack.com/p/how-real-time-proving-rtp-enhances

### Architecture - 

![Auction](https://github.com/user-attachments/assets/501203a4-d483-4dbe-939f-c633f2939b10)

