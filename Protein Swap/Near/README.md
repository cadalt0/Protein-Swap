# NEAR Atomic Swap Protocol

A complete atomic swap implementation on NEAR Protocol using Hash Time-Locked Contracts (HTLC). This project consists of two smart contracts: a NEP-141 token contract (UNITE) and an escrow contract for secure atomic swaps.

## 🏗️ Project Structure

- **Token-Contract/**: NEP-141 compliant UNITE token with open minting
- **Escrow-Contract/**: Hash Time-Locked Contract for atomic swaps
- **escrow.js**: Interactive atomic swap demo script

## 📦 Contracts Overview

### UNITE Token Contract
- **Standard**: NEP-141 Fungible Token
- **Features**: Open minting, burning, transfers
- **Symbol**: UNITE
- **Decimals**: 24

### Escrow Contract  
- **Type**: Hash Time-Locked Contract (HTLC)
- **Features**: Atomic swaps, timelock protection, secret revelation
- **Security**: Trustless execution

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Deployed Contract Addresses

We have pre-deployed contracts on NEAR testnet for testing:

```env
# Pre-deployed Contract Addresses
TOKEN_ACCOUNT_ID=unite-defi.sickwheat5604.testnet
ESCROW_ACCOUNT_ID=escrow.sickwheat5604.testnet
```

**Contract Explorer Links:**
- **Token Contract**: [https://testnet.nearblocks.io/address/unite-defi.sickwheat5604.testnet](https://testnet.nearblocks.io/address/unite-defi.sickwheat5604.testnet)
- **Escrow Contract**: [https://testnet.nearblocks.io/address/escrow.sickwheat5604.testnet](https://testnet.nearblocks.io/address/escrow.sickwheat5604.testnet)

## 🧪 Testing Options

You have two testing options:

### Option 1: Use Pre-deployed Contracts (Recommended)
### Option 2: Deploy Fresh Contracts

---

## 🎯 Option 1: Test with Pre-deployed Contracts

### Step 1: Create Test Accounts

You'll need two NEAR testnet accounts:

1. **Create wallets** at [https://wallet.meteorwallet.app/add_wallet/create_new](https://wallet.meteorwallet.app/add_wallet/create_new)
2. **Fund both accounts** at [https://near-faucet.io/](https://near-faucet.io/)

**Important**: Both User Q (escrow creator) and Taker (secret revealer) accounts need NEAR tokens for gas fees.

### Step 2: Get Account Credentials

Import your accounts to get private keys:

```bash
near account import-account using-private-key [YOUR_PRIVATE_KEY] network-config
```

Get private keys from:
- **Windows**: `C:\Users\[USERNAME]\.near-credentials\testnet\[ACCOUNT_ID].json`
- **Linux/Mac**: `~/.near-credentials/testnet/[ACCOUNT_ID].json`

### Step 3: Get UNITE Tokens

For token minting instructions, see the [Token Contract README](./Token-Contract/README.md).

Quick mint command:
```bash
# Set your minter credentials and run
node Token-Contract/script/mint.js
```

### Step 4: Configure Environment

Create `.env` file with your account details:

```env
# NEAR Network Configuration
NEAR_NETWORK_ID=testnet
NEAR_NODE_URL=https://rpc.testnet.near.org

# Pre-deployed Contract Addresses
TOKEN_ACCOUNT_ID=unite-defi.sickwheat5604.testnet
ESCROW_ACCOUNT_ID=escrow.sickwheat5604.testnet

# User Q Configuration (Escrow Creator)
USER_Q_ACCOUNT_ID=your-userq-account.testnet
USER_Q_PRIVATE_KEY=ed25519:your-userq-private-key-here

# Taker Configuration (Secret Revealer)
TAKER_ACCOUNT_ID=your-taker-account.testnet
TAKER_PRIVATE_KEY=ed25519:your-taker-private-key-here

# Escrow Parameters
ESCROW_AMOUNT=10000000000000000000000
TIMELOCK_DURATION=3600
```

### Step 5: Run Atomic Swap Demo

```bash
node escrow.js
```

This will:
1. ✅ Initialize escrow contract (if needed)
2. ✅ Check token balances
3. ✅ Create escrow with random order ID and secret
4. ✅ Wait 5 seconds
5. ✅ Taker reveals secret and receives tokens

---

## 🔧 Option 2: Test with Fresh Deployed Contracts

### Step 1: Deploy Both Contracts

1. **Deploy Token Contract**: Follow [Token Contract README](./Token-Contract/README.md)
2. **Deploy Escrow Contract**: Follow [Escrow Contract README](./Escrow-Contract/README.md)

### Step 2: Mint Tokens

Follow the minting instructions in the [Token Contract README](./Token-Contract/README.md)

### Step 3: Configure Environment

Create `.env` file with your fresh contract addresses:

```env
# NEAR Network Configuration
NEAR_NETWORK_ID=testnet
NEAR_NODE_URL=https://rpc.testnet.near.org

# Your Fresh Contract Addresses
TOKEN_ACCOUNT_ID=unite.youraccount.testnet
ESCROW_ACCOUNT_ID=escrow.youraccount.testnet

# User Q Configuration (Escrow Creator)
USER_Q_ACCOUNT_ID=your-userq-account.testnet
USER_Q_PRIVATE_KEY=ed25519:your-userq-private-key-here

# Taker Configuration (Secret Revealer)
TAKER_ACCOUNT_ID=your-taker-account.testnet
TAKER_PRIVATE_KEY=ed25519:your-taker-private-key-here

# Escrow Parameters
ESCROW_AMOUNT=10000000000000000000000
TIMELOCK_DURATION=3600
```

### Step 4: Run Atomic Swap Demo

```bash
node escrow.js
```

---

## 💰 Funding Requirements

**All accounts need NEAR tokens for gas fees:**

- **User Q Account**: Needs NEAR for escrow creation transactions
- **Taker Account**: Needs NEAR for secret revelation transactions  
- **Contract Accounts**: Need NEAR for contract deployment (if deploying fresh)

**Get testnet NEAR**: [https://near-faucet.io/](https://near-faucet.io/)

## 🎮 Demo Commands

```bash
# Run complete atomic swap demo
node escrow.js demo

# Create escrow only
node escrow.js create

# Reveal secret manually
node escrow.js reveal [orderId] [secret]

# Check token balances
node escrow.js balances

# Initialize escrow contract
node escrow.js init
```

## 📋 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TOKEN_ACCOUNT_ID` | Token contract address | `unite-defi.sickwheat5604.testnet` |
| `ESCROW_ACCOUNT_ID` | Escrow contract address | `escrow.sickwheat5604.testnet` |
| `USER_Q_ACCOUNT_ID` | Escrow creator account | `alice.testnet` |
| `USER_Q_PRIVATE_KEY` | Escrow creator private key | `ed25519:...` |
| `TAKER_ACCOUNT_ID` | Secret revealer account | `bob.testnet` |
| `TAKER_PRIVATE_KEY` | Secret revealer private key | `ed25519:...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ESCROW_AMOUNT` | Tokens to escrow | `10000000000000000000000` (10 UNITE) |
| `TIMELOCK_DURATION` | Timeout in seconds | `3600` (1 hour) |

## 🔍 How Atomic Swaps Work

### 1. Escrow Creation
- User Q deposits tokens into escrow contract
- Provides cryptographic hash of a secret
- Sets taker account and timelock duration

### 2. Secret Revelation
- Taker reveals the secret that matches the hash
- Smart contract verifies the secret
- Tokens are automatically transferred to taker

### 3. Timeout Protection
- If secret isn't revealed before timelock expires
- User Q can reclaim their escrowed tokens
- Prevents permanent loss of funds

## 🛡️ Security Features

- **Hash Verification**: Cryptographic proof of secret knowledge
- **Timelock Protection**: Automatic refunds after expiration
- **Atomic Execution**: All-or-nothing transaction completion
- **Trustless**: No third-party intermediaries required

## 📚 Documentation

- [Token Contract README](./Token-Contract/README.md) - Complete token deployment guide
- [Escrow Contract README](./Escrow-Contract/README.md) - Complete escrow deployment guide

## 🔗 Useful Links

- **Meteor Wallet**: [https://wallet.meteorwallet.app/add_wallet/create_new](https://wallet.meteorwallet.app/add_wallet/create_new)
- **NEAR Faucet**: [https://near-faucet.io/](https://near-faucet.io/)
- **NEAR Explorer**: [https://testnet.nearblocks.io/](https://testnet.nearblocks.io/)
- **NEAR Documentation**: [https://docs.near.org/](https://docs.near.org/)

## 🚨 Important Notes

1. **Testnet Only**: These contracts are for testing purposes
2. **Fund All Accounts**: Every account needs NEAR for gas fees
3. **Open Minting**: Anyone can mint UNITE tokens (testing feature)
4. **Random Secrets**: Each demo run generates new order ID and secret
5. **Taker Reveals**: The taker account reveals the secret (not the creator)

## 🎉 Example Demo Output

```
🚀 Starting Atomic Swap Escrow Demo
==================================================
✅ All required environment variables are set
📋 Current Configuration:
   Network ID: testnet
   Token Contract: unite-defi.sickwheat5604.testnet
   Escrow Contract: escrow.sickwheat5604.testnet
   User Q: alice.testnet
   Taker: bob.testnet
   Amount: 10000000000000000000000 (10 UNITE tokens)
   Order ID: order-1703123456789-abc123def (random)
   Secret: a1b2c3d4e5f6789012345678901234567890abcd (random)

🔧 Escrow contract is already initialized
💰 Checking current balances...
User Q balance: 1000000000000000000000000 (1000 UNITE tokens)
Taker balance: 0 (0 UNITE tokens)

🔐 Step 1: User Q creating escrow...
✅ Tokens transferred to escrow contract
✅ Escrow created successfully!

⏳ Waiting 5 seconds before revealing secret...
✅ 5 seconds elapsed

🔓 Step 2: Taker revealing secret...
✅ Secret revealed successfully!
💰 Checking balances...
User Q balance: 990000000000000000000000 (990 UNITE tokens)
Taker balance: 10000000000000000000000 (10 UNITE tokens)

🎉 Atomic Swap Demo Completed Successfully!
```

## 📄 License

MIT License - see LICENSE file for details.