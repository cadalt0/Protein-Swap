# UNITE Token Contract - NEAR Protocol

A NEP-141 compliant fungible token contract on NEAR Protocol that allows anyone to mint tokens. UNITE tokens are designed for testing, development, and open minting scenarios.

## Features

- 🪙 **NEP-141 Standard**: Fully compliant fungible token implementation
- 🆓 **Open Minting**: Anyone can mint tokens to any account
- 🔥 **Token Burning**: Users can burn their own tokens
- 💸 **Transfer Support**: Standard and transfer-call functionality
- 🏗️ **Ownership Transfer**: Contract ownership can be transferred
- 📊 **Event Logging**: NEP-297 compliant event emissions

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

This will create the WASM file at `target/near/v1tokens.wasm`.

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

### Step 3: Create Token Contract Account

```bash
near account create-account fund-myself [TOKEN_ACCOUNT_ID] 1NEAR autogenerate-new-keypair
```

Example:
```bash
near account create-account fund-myself unite.youraccount.testnet 1NEAR autogenerate-new-keypair
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

Create a `.env` file in the `Token-Contract` directory:

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
TOKEN_ACCOUNT_ID=unite.youraccount.testnet

# Private Keys (from the JSON files)
OWNER_PRIVATE_KEY=ed25519:your-owner-private-key-here
TOKEN_PRIVATE_KEY=ed25519:your-token-private-key-here

# Contract Configuration
WASM_PATH=./target/near/v1tokens.wasm
TOTAL_SUPPLY=1000000000000000000000000
GAS_LIMIT=300000000000000
ATTACHED_DEPOSIT=0

# Minting Configuration (Required for mint.js)
MINT_AMOUNT=100000000000000000000000
RECIPIENT_ACCOUNT_ID=youraccount.testnet

# Minter Credentials (Optional - allows anyone to mint tokens)
MINTER_PRIVATE_KEY=ed25519:your-minter-private-key-here
MINTER_ACCOUNT_ID=your-minter-account.testnet

# Optional Token Deployment Configuration
ENABLE_MINTING=false
TRANSFER_AMOUNT=10000000000000000000000
```

### Step 6: Deploy Token Contract

```bash
node script/deploy-token.js
```

## Usage

### Deploy Token Contract
```bash
node script/deploy-token.js
```

### Mint Tokens (Anyone Can Mint)
```bash
node script/mint.js
```

### Check Token Balance
```bash
# Using the mint script with balance command
node script/mint.js balance [account_id]
```

## Environment Variables Reference

### Required Variables for Deployment

| Variable | Description | Example |
|----------|-------------|---------|
| `OWNER_ACCOUNT_ID` | Your NEAR account ID | `youraccount.testnet` |
| `TOKEN_ACCOUNT_ID` | The token contract account ID | `unite.youraccount.testnet` |
| `OWNER_PRIVATE_KEY` | Your account's private key | `ed25519:4UuecPKeSFkJwQA7...` |
| `TOKEN_PRIVATE_KEY` | Token contract's private key | `ed25519:7s75gRMGUNQMUCmq...` |

### Required Variables for Minting

| Variable | Description | Example |
|----------|-------------|---------|
| `TOKEN_ACCOUNT_ID` | The token contract account ID | `unite.youraccount.testnet` |
| `MINTER_ACCOUNT_ID` | Account that will mint tokens | `alice.testnet` |
| `MINTER_PRIVATE_KEY` | Minter account's private key | `ed25519:2zwXzLEi5HLk2tnKUZa3...` |
| `RECIPIENT_ACCOUNT_ID` | Where tokens will be minted to | `bob.testnet` |



## Token Information

### Token Metadata
- **Name**: UNITE V1
- **Symbol**: UNITE
- **Decimals**: 24
- **Standard**: NEP-141

### Token Economics
- **Initial Supply**: 1,000,000 UNITE tokens (configurable)
- **Minting**: Open to anyone (no restrictions)
- **Burning**: Users can burn their own tokens
- **Max Supply**: Unlimited (inflationary)

## How Token Minting Works

### 1. Anyone Can Mint
- No permission checks for minting
- Any account can mint tokens to any other account
- Requires 1 yoctoNEAR attached deposit (anti-spam measure)

### 2. Minting Process
```bash
# Set up environment with your credentials
MINTER_ACCOUNT_ID=alice.testnet
MINTER_PRIVATE_KEY=ed25519:your-key-here
RECIPIENT_ACCOUNT_ID=bob.testnet
MINT_AMOUNT=1000000000000000000000000

# Run minting script
node script/mint.js
```

### 3. Token Balance Check
```bash
# Check balance of any account
node script/mint.js balance recipient.testnet
```

## Smart Contract Methods

### Public Methods

```rust
// Initialize contract
new(owner_id: AccountId, total_supply: U128, metadata: Option<FungibleTokenMetadata>)

// Mint tokens (anyone can call)
mint(account_id: AccountId, amount: U128)

// Burn tokens (only token holder)
burn(amount: U128)

// Transfer ownership
transfer_ownership(new_owner_id: AccountId)
```

### NEP-141 Standard Methods

```rust
// Get total supply
ft_total_supply() -> U128

// Get balance of account
ft_balance_of(account_id: AccountId) -> U128

// Transfer tokens
ft_transfer(receiver_id: AccountId, amount: U128, memo: Option<String>)

// Transfer with callback
ft_transfer_call(receiver_id: AccountId, amount: U128, memo: Option<String>, msg: String) -> PromiseOrValue<U128>
```

### View Methods

```rust
// Get token metadata
ft_metadata() -> FungibleTokenMetadata

// Get contract owner
get_owner() -> AccountId

// Storage balance methods (NEP-145)
storage_balance_bounds() -> StorageBalanceBounds
storage_balance_of(account_id: AccountId) -> Option<StorageBalance>
```

## Creating Additional Minter Accounts

If you want to create additional accounts for minting:

### 1. Create New Account
```bash
near account create-account fund-myself alice.youraccount.testnet 1NEAR autogenerate-new-keypair
```

### 2. Get Private Key
```bash
# Windows
cat C:\Users\[USERNAME]\.near-credentials\testnet\alice.youraccount.testnet.json

# Linux/Mac
cat ~/.near-credentials/testnet/alice.youraccount.testnet.json
```

### 3. Update Environment
```env
MINTER_ACCOUNT_ID=alice.youraccount.testnet
MINTER_PRIVATE_KEY=ed25519:alice-private-key-here
```

### 4. Mint Tokens
```bash
node script/mint.js
```
