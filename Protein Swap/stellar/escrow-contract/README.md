# Atomic Swap Escrow Contract

## Contract Information

**Deployed Contract ID:** `CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB`

**Explorer Link:** [View on Stellar Explorer](https://stellar.expert/explorer/testnet/contract/CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB)

## Prerequisites

Before building and deploying this contract, you need to install:

- **WSL (Windows Subsystem for Linux)** - Required for running Linux commands on Windows
- **Stellar CLI** - The official Stellar command-line interface

## ⚠️ CRITICAL: Hardcoded Contract Deployer Address

**If you're deploying your own fresh contract**, you MUST update the hardcoded contract deployer address in the source code:

### Location: `escrow-contract/contracts/hello-world/src/lib.rs`
- **Line 181:** `"GDGFQGWD6DE6ZZO6F5SWBDB7N7RCYCW4B36IMNNLJKQHOYIKRSSVU6E2"`
- **Line 254:** `"GDGFQGWD6DE6ZZO6F5SWBDB7N7RCYCW4B36IMNNLJKQHOYIKRSSVU6E2"`

### What to do:

1. **Get your deployer address:**
   ```bash
   stellar keys show test-1
   ```

2. **Edit the source code:**
   - Open `escrow-contract/contracts/hello-world/src/lib.rs`
   - Replace `"GDGFQGWD6DE6ZZO6F5SWBDB7N7RCYCW4B36IMNNLJKQHOYIKRSSVU6E2"` with your deployer address
   - Update both lines 181 and 254

3. **Rebuild and deploy:**
   ```bash
   stellar contract build
   stellar contract deploy --network testnet --source-account test-1 --wasm target/wasm32v1-none/release/atomic_swap_escrow.wasm
   ```

### Why this matters:
- The contract deployer has special privileges to reveal secrets and cancel escrows
- If you don't update this address, you won't be able to use these functions with your own contract
- The current address is specific to the deployed contract and won't work with your fresh deployment

## Setup Instructions

### 1. Create a Wallet Key

Generate a new wallet key for testing:

```bash
stellar keys generate --global test-1 --network testnet --fund
```

### 2. Fund Your Wallet

Fund your newly created wallet:

```bash
stellar keys fund test-1
```

## Build and Deploy

### 3. Build the Contract

Build the contract using the Stellar CLI:

```bash
stellar contract build
```

### 4. Deploy the Contract

Deploy the contract to the testnet:

```bash
stellar contract deploy --network testnet --source-account test-1 --wasm target/wasm32v1-none/release/atomic_swap_escrow.wasm
```

**Note:** If you changed the wallet name from `test-1`, make sure to update it in the command above.

## Contract Features

- **Atomic Swap Escrow:** Secure token exchange with hashlock and timelock mechanisms
- **Hashlock Protection:** Uses SHA-256 hash verification for secret revelation
- **Timelock Mechanism:** Automatic cancellation after time expiry
- **Multi-Party Support:** Supports different owners and takers
- **Event Logging:** Comprehensive event tracking for all operations

## Core Functions

### Create Escrow
Creates a new escrow with tokens locked by hashlock and timelock:

```bash
stellar contract invoke --network testnet --source-account test-1 --id CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB -- create_escrow --owner <owner-address> --order_id "order123" --hash <hash-bytes> --taker <taker-address> --token_contract <token-contract-id> --amount 1000000000 --timelock_duration 3600
```

### Reveal Secret
Reveals the secret to complete the atomic swap:

```bash
stellar contract invoke --network testnet --source-account test-1 --id CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB -- reveal_secret --caller <caller-address> --order_id "order123" --owner <owner-address> --secret <secret-bytes>
```

### Cancel Escrow
Cancels an escrow after timelock expiry:

```bash
stellar contract invoke --network testnet --source-account test-1 --id CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB -- cancel_escrow --caller <caller-address> --order_id "order123" --owner <owner-address>
```

## Query Functions

### Check Escrow Exists
```bash
stellar contract invoke --network testnet --source-account test-1 --id CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB -- escrow_exists --order_id "order123" --owner <owner-address>
```

### Get Escrow Details
```bash
stellar contract invoke --network testnet --source-account test-1 --id CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB -- get_escrow --order_id "order123" --owner <owner-address>
```

### Check Escrow Status
```bash
stellar contract invoke --network testnet --source-account test-1 --id CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB -- is_escrow_active --order_id "order123" --owner <owner-address>
```

### Check Timelock Status
```bash
stellar contract invoke --network testnet --source-account test-1 --id CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB -- is_timelock_expired --order_id "order123" --owner <owner-address>
```

## Utility Functions

### Get Current Timestamp
```bash
stellar contract invoke --network testnet --source-account test-1 --id CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB -- get_current_timestamp
```

### Compute Hash
```bash
stellar contract invoke --network testnet --source-account test-1 --id CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB -- compute_hash --data <data-bytes>
```

## Escrow Lifecycle

1. **Create Escrow:** Owner locks tokens with hashlock and timelock
2. **Active State:** Escrow is waiting for secret revelation or timelock expiry
3. **Complete:** Taker reveals secret, tokens transferred to taker
4. **Cancel:** Timelock expires, tokens returned to owner

## Security Features

- **Hashlock Verification:** SHA-256 hash verification prevents unauthorized completion
- **Timelock Protection:** Automatic cancellation prevents indefinite locking
- **Authorization Checks:** Only authorized parties can perform actions
- **State Validation:** Prevents operations on inactive escrows

## Important Notes

- The contract is deployed on the **Stellar testnet**
- Make sure to replace wallet names and addresses as needed
- The contract ID is hardcoded for this specific deployment
- All amounts should be specified in the token's smallest unit
- Timelock duration is in seconds
- Hash and secret should be provided as byte arrays
