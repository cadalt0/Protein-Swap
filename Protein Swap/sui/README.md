# Sui Atomic Swap Escrow System

A complete atomic swap escrow system built on Sui blockchain with public token minting capabilities.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Sui CLI installed
- A Sui wallet with testnet SUI

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build Contracts**
   ```bash
   sui move build
   ```

## 📋 Deployed Contract Details

### Contract Package ID
```
PACKAGE_ID=0xf29cda5ed324ec0e2aa111354ae2c0e9213b58ced054ab08523da9f90c081b69
```

### Shared Treasury Object ID
```
TREASURY_OBJECT=0xe5f587c8e044984b30da0030b410ad1c0fe2c4d0a96cdb501ede793252005e24
```

### Escrow Registry ID
```
ESCROW_REGISTRY_ID=0x0485911b67adfab1baae52d149aa0eed50db6ec1bdf6dfa24a94fa0e22eb95c1
```

### Explorer Links
- **Package**: [View on Sui Explorer](https://testnet.suivision.xyz/object/0xf29cda5ed324ec0e2aa111354ae2c0e9213b58ced054ab08523da9f90c081b69?network=testnet)
- **Treasury**: [View on Sui Explorer](https://testnet.suivision.xyz/object/0xe5f587c8e044984b30da0030b410ad1c0fe2c4d0a96cdb501ede793252005e24?network=testnet)
- **Escrow Registry**: [View on Sui Explorer](https://testnet.suivision.xyz/object/0x0485911b67adfab1baae52d149aa0eed50db6ec1bdf6dfa24a94fa0e22eb95c1?network=testnet)

## 🔧 Deployment Instructions

### Step 1: Create a New Wallet
```bash
sui client new-address ed25519
```
This will create a new keypair and set it as the active address.

### Step 2: Fund Your Wallet
Visit the [Sui Testnet Faucet](https://faucet.sui.io/) and fund your wallet with testnet SUI.

### Step 3: Deploy Contracts
Choose one of the following deployment commands:

**Option 1 (Recommended):**
```bash
sui client publish --skip-fetch-latest-git-deps
```

**Option 2:**
```bash
sui client publish
```

### Step 4: Extract Deployment Details
After successful deployment, extract the following details from the output:
- **Package ID**: Look for `PackageID: 0x...`
- **Treasury Object ID**: Look for `ObjectID: 0x...` with `ObjectType: ...::unite_v1::Treasury`
- **Escrow Registry ID**: Look for `ObjectID: 0x...` with `ObjectType: ...::escrow::EscrowRegistry`

## 🪙 Minting Tokens

### Step 1: Configure Environment
Create a `.env` file in the root directory with the following details:

```env
# Your private key (from sui client keypair export)
PRIVATE_KEY=your_private_key_here

# Deployment details (replace with your actual values)
PACKAGE_ID=0xf29cda5ed324ec0e2aa111354ae2c0e9213b58ced054ab08523da9f90c081b69
TREASURY_OBJECT=0xe5f587c8e044984b30da0030b410ad1c0fe2c4d0a96cdb501ede793252005e24

# Minting configuration
DEFAULT_AMOUNT=10000000000000000
DEFAULT_RECIPIENT=0x4ecc4ad6c5722f1e9d17e5006b67cb1b75b8429f57a05b89016a2ed34d381a49
```

### Step 2: Mint Tokens
```bash
npm run mint
```

This will mint tokens to the specified recipient address.

## 🧪 Testing Escrow Functionality

### Step 1: Configure Test Environment
Add the following to your `.env` file:

```env
# Escrow testing configuration
ESCROW_REGISTRY_ID=0x0485911b67adfab1baae52d149aa0eed50db6ec1bdf6dfa24a94fa0e22eb95c1

# Creator details
CREATOR_PRIVATE_KEY=your_creator_private_key
CREATOR_ADDRESS=0x4ecc4ad6c5722f1e9d17e5006b67cb1b75b8429f57a05b89016a2ed34d381a49

# Taker details
TAKER_PRIVATE_KEY=your_taker_private_key
TAKER_ADDRESS=0x521f226b96813625a2078dd0b5b62df14c8c1a896026680109f12c40c5e3b7d2

# Escrow parameters
DESIRED_AMOUNT=1000000000
TIMELOCK_MS=60000
```

### Step 2: Run Escrow Test
```bash
npm run test:escrow
```

This will:
1. Create an escrow with random order ID and secret
2. Lock tokens in the escrow
3. Unlock the escrow using the secret
4. Display transaction details and explorer links

## 📁 Project Structure

```
sui/
├── sources/
│   ├── mocktoken.move      # UNITE_V1 token with public minting
│   └── Escrowsui.move     # Atomic swap escrow contract
├── script/
│   └── mint.js            # Token minting script
├── tests/
│   └── escrow-demo.js     # Escrow testing script
├── package.json           # Dependencies and scripts
├── Move.toml             # Move package configuration
└── README.md             # This file
```

## 🔍 Available Scripts

- `npm run mint` - Mint tokens using public minting
- `npm run test:escrow` - Test escrow creation and unlocking
- `sui move build` - Build Move contracts
- `sui client publish` - Deploy contracts to testnet

## 🎯 Key Features

### Public Token Minting
- Anyone can mint UNITE_V1 tokens using the shared Treasury object
- No owner restrictions on minting
- 9 decimal precision

### Atomic Swap Escrow
- Secure escrow creation with secret hashing
- Time-locked escrow functionality
- Support for any token type
- Automatic escrow unlocking with secret revelation

**Happy Building! 🚀** 