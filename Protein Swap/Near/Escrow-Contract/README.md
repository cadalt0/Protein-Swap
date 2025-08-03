# Escrow Contract - NEAR Protocol

A smart contract for atomic swaps on NEAR Protocol that enables secure token exchanges using hash time-locked contracts (HTLC).

## Features

- 🔐 **Hash Time-Locked Contracts**: Secure escrow using cryptographic hashes
- 💰 **Token Support**: Works with any NEP-141 fungible token
- ⏰ **Timelock Protection**: Automatic refunds after expiration
- 🔓 **Secret Reveal**: Atomic swap completion via secret revelation
- 🛡️ **Security**: Trustless execution with smart contract guarantees

## Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [Rust](https://rustup.rs/)
- [NEAR CLI](https://docs.near.org/tools/near-cli)
- [Cargo NEAR](https://github.com/near/cargo-near)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Rust and Cargo NEAR

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install cargo-near
cargo install cargo-near
```

## Building the Contract

```bash
cargo near build non-reproducible-wasm
```

This will create the WASM file at `target/near/v1.wasm`.

## Testnet Deployment

### Step 1: Create NEAR Wallet

1. **Create a new wallet** at [https://wallet.meteorwallet.app/add_wallet/create_new](https://wallet.meteorwallet.app/add_wallet/create_new)
2. **Save your seed phrase** securely
3. **Fund your wallet** with testnet tokens at [https://near-faucet.io/](https://near-faucet.io/)

### Step 2: Import Account to NEAR CLI

```bash
near account import-account using-private-key [YOUR_PRIVATE_KEY] network-config
```

When prompted:
- Select: **testnet**
- Enter: **your account ID** (e.g., `youraccount.testnet`)
- Select: **No, I want to skip the check and use the specified account ID.**
- Select: **No, I want to save the access key information.**
- Select: **Store the access key in my keychain**

### Step 3: Create Contract Account

```bash
near account create-account fund-myself [CONTRACT_ACCOUNT_ID] 1 autogenerate-new-keypair
```

Example:
```bash
near account create-account fund-myself escrow.youraccount.testnet 1NEAR autogenerate-new-keypair
```

When prompted:
- Select: **save to key chain**
- Select: **testnet**
- Select: **No, I want to skip the check and use the specified account ID.**
- Select: **sign-with-keychain - Sign the transaction with a key saved in the secure keychain**

### Step 4: Get Private Keys

Extract private keys from your local credentials:

**Windows:**
```bash
cat C:\Users\[USERNAME]\.near-credentials\testnet\[ACCOUNT_ID].json
```

**Linux/Mac:**
```bash
cat ~/.near-credentials/testnet/[ACCOUNT_ID].json
```

### Step 5: Configure Environment Variables

Create a `.env` file in the `Escrow-Contract` directory:

```bash
cp script/env.example .env
```

Edit `.env` with your account details:

```env
# NEAR Network Configuration
NEAR_NETWORK_ID=testnet
NEAR_NODE_URL=https://rpc.testnet.near.org

# Account Configuration
OWNER_ACCOUNT_ID=youraccount.testnet
ESCROW_ACCOUNT_ID=escrow.youraccount.testnet

# Private Keys (from the JSON files)
OWNER_PRIVATE_KEY=ed25519:your-owner-private-key-here
ESCROW_PRIVATE_KEY=ed25519:your-escrow-private-key-here

# Contract Configuration
WASM_PATH=./target/near/v1.wasm
GAS_LIMIT=300000000000000
ATTACHED_DEPOSIT=0

# Token Contract (for escrow operations)
TOKEN_CONTRACT=unite.bigseal2466.testnet

# Test Configuration (optional)
TEST_TAKER=alice.testnet
TEST_AMOUNT=10000000000000000000000
TEST_TIMELOCK=3600
```

### Step 6: Deploy Contract

```bash
node script/deploy.js
```

## Usage

### Deploy Only
```bash
node script/deploy.js deploy
```

### Test Escrow Functionality
```bash
node script/deploy.js test
```

### Deploy and Test
```bash
node script/deploy.js deploy-and-test
```

### Initialize Contract (if needed)
```bash
node script/deploy.js init
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OWNER_ACCOUNT_ID` | Your NEAR account ID | `youraccount.testnet` |
| `ESCROW_ACCOUNT_ID` | The escrow contract account ID | `escrow.youraccount.testnet` |
| `OWNER_PRIVATE_KEY` | Your account's private key | `ed25519:4UuecPKeSFkJwQA7...` |
| `ESCROW_PRIVATE_KEY` | Escrow contract's private key | `ed25519:2zwXzLEi5HLk2tnKUZa3...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEAR_NETWORK_ID` | NEAR network (testnet/mainnet) | `testnet` |
| `NEAR_NODE_URL` | NEAR RPC endpoint | `https://rpc.testnet.near.org` |
| `WASM_PATH` | Path to the compiled WASM file | `./target/near/v1.wasm` |
| `GAS_LIMIT` | Gas limit for transactions | `300000000000000` |
| `ATTACHED_DEPOSIT` | NEAR deposit for deployment | `0` |
| `TOKEN_CONTRACT` | Token contract for escrow operations | `unite.bigseal2466.testnet` |
| `TEST_TAKER` | Test taker account for escrow testing | `alice.testnet` |
| `TEST_AMOUNT` | Test amount for escrow testing | `10000000000000000000000` |
| `TEST_TIMELOCK` | Test timelock duration (seconds) | `3600` |

## How Escrow Works

### 1. Create Escrow
- User Q deposits tokens into escrow
- Provides hash of a secret
- Sets taker account and timelock duration

### 2. Reveal Secret
- Taker reveals the secret that matches the hash
- Tokens are automatically transferred to taker
- Process is atomic and trustless

### 3. Timeout Protection
- If secret isn't revealed before timelock expires
- User Q can reclaim their tokens
- Prevents funds from being locked forever

## Smart Contract Methods

### Public Methods

```rust
// Create a new escrow
create_escrow(order_id: String, hash: Vec<u8>, taker: AccountId, token_contract: AccountId, amount: U128, timelock_duration: u64)

// Reveal secret to claim tokens
reveal_secret(order_id: String, owner: AccountId, secret: Vec<u8>)

// Reclaim tokens after timeout
reclaim_escrow(order_id: String)
```

### View Methods

```rust
// Check if escrow exists
escrow_exists(order_id: String, owner: AccountId) -> bool

// Get escrow details
get_escrow(order_id: String, owner: AccountId) -> Escrow

// Get total escrow count
get_escrow_count() -> u64
```


### Common Issues



2. **WASM File Not Found**
   ```bash
   cargo near build non-reproducible-wasm
   ```

3. **Insufficient Balance**
   - Fund your accounts at [https://near-faucet.io/](https://near-faucet.io/)
   - Ensure both owner and contract accounts have sufficient balance

4. **Network Connection Issues**
   - Check your internet connection
   - Verify RPC endpoint is accessible
   - Try switching between different RPC endpoints
