# TRON Atomic Swap Escrow System

A  atomic swap escrow system built on the TRON blockchain, enabling secure token swaps between parties using Hash Time Locked Contracts (HTLC).

## 📝 Contract Addresses (Shasta Testnet)

```
UniteV1 Token: TK9yXMjtxHFxpFymQFbdbcZHJvWjSjP2Jc
AtomicSwapEscrow: TTKDb3vVpQiyKJwSoNMJpCifRZEs4CnWUb
```

**🔍 Contract Links:**
- [Token Contract](https://shasta.tronscan.org/#/contract/TK9yXMjtxHFxpFymQFbdbcZHJvWjSjP2Jc)
- [Escrow Contract](https://shasta.tronscan.org/#/contract/TTKDb3vVpQiyKJwSoNMJpCifRZEs4CnWUb)

## 🏗️ Architecture

This project consists of two main smart contracts:

- **UniteV1.sol** - ERC20-compatible token contract with public minting
- **AtomicSwapEscrow.sol** - HTLC escrow contract for secure atomic swaps

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- TRON wallet with testnet TRX (for gas fees)
- Basic understanding of smart contracts

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the sample environment file and configure your settings:

```bash
cp sample-env .env
```

Edit `.env` with your configuration:

```env
# Network Configuration
RPC_URL=https://api.shasta.trongrid.io

# Private Keys (Keep these secure!)
PRIVATE_KEY_OWNER=your_owner_private_key_here
PRIVATE_KEY_TAKER=your_taker_private_key_here

# Taker Address
TAKER_ADDRESS=your_taker_public_address_here

# Contract Addresses (Deployed contracts)
ESCROW_CONTRACT_ADDRESS=TTKDb3vVpQiyKJwSoNMJpCifRZEs4CnWUb
TOKEN_ADDRESS=TK9yXMjtxHFxpFymQFbdbcZHJvWjSjP2Jc

# Optional Configuration
TOKEN_AMOUNT=10000000000000000000
TIMELOCK_DURATION=3600

# ===========================================
# Minting Configuration
# ===========================================

# Private Key
PRIVATE_KEY=your_private_key_here

# Token Contract Address
TOKEN_ADDRESS=TK9yXMjtxHFxpFymQFbdbcZHJvWjSjP2Jc

# Recipient Address
RECIPIENT_ADDRESS=your_recipient_address_here

# Optional Minting Configuration
MINT_AMOUNT=10000000000000000000000000
```

## 📜 Smart Contracts

### UniteV1 Token Contract

**Features:**
- ERC20-compatible TRC20 token
- Public minting (anyone can mint)
- Standard transfer, approve, and allowance functions
- Burn functionality

**Key Functions:**
- `mint(address to, uint256 amount)` - Mint tokens to any address
- `transfer(address to, uint256 amount)` - Transfer tokens
- `approve(address spender, uint256 amount)` - Approve spending
- `transferFrom(address from, address to, uint256 amount)` - Transfer from approved address

### AtomicSwapEscrow Contract

**Features:**
- Hash Time Locked Contract (HTLC) implementation
- Support for TRC20 token swaps
- Time-based escrow with automatic refund
- Secure secret revelation mechanism

**Key Functions:**
- `createEscrow(string orderId, bytes32 hash, address taker, address tokenAddress, uint256 amount, uint256 timelockDuration)` - Create new escrow
- `revealSecret(string orderId, address owner, bytes memory secret)` - Complete swap by revealing secret
- `cancelEscrow(string orderId, address owner)` - Cancel escrow after timelock expires

## 🛠️ Deployment Instructions

### Method 1: Using TronIDE (Recommended)

1. **Visit [TronIDE](https://tronide.io/)**
2. **Upload Contracts:**
   - Upload `contracts/UniteV1.sol`
   - Upload `contracts/AtomicSwapEscrow.sol`
3. **Compile Contracts:**
   - Select Solidity version 0.8.6
   - Enable optimization
   - Compile both contracts
4. **Deploy:**
   - Select "Injected TronWeb"
   - Connect your TRON wallet
   - Deploy UniteV1.sol first
   - Deploy AtomicSwapEscrow.sol
   - Save both contract addresses

### Method 2: Using TronBox

```bash
# Configure your private key in .env
export PRIVATE_KEY_SHASTA=your_private_key_here

# Deploy to Shasta testnet
tronbox migrate --network shasta
```

## 🧪 Testing

### Prerequisites for Testing

1. **Get Testnet TRX:**
   - Visit [Shasta Faucet](https://www.trongrid.io/faucet)
   - Request testnet TRX for gas fees

2. **Deploy or Use Existing Contracts:**
   - Use the provided contract addresses, or
   - Deploy your own contracts using TronIDE

### Test Method 1: Using Deployed Contracts

The following contracts are already deployed on Shasta testnet:

```
ESCROW_CONTRACT_ADDRESS=TTKDb3vVpQiyKJwSoNMJpCifRZEs4CnWUb
TOKEN_ADDRESS=TK9yXMjtxHFxpFymQFbdbcZHJvWjSjP2Jc
```

#### Step 1: Mint Tokens

```bash
# Ensure your .env is configured
npm run mint-env
```

This will mint tokens to the recipient address specified in your `.env` file.

#### Step 2: Test Atomic Swap

```bash
# Run the escrow test
npm run escrow
```

This will:
1. Create an escrow with random order ID and secret
2. Wait 5 seconds
3. Unlock the escrow using the taker's private key
4. Display transaction details and final balances

### Test Method 2: Fresh Deployment

1. **Deploy Contracts:**
   - Go to [TronIDE](https://tronide.io/)
   - Deploy both contracts
   - Save the contract addresses

2. **Update Environment:**
   ```env
   ESCROW_CONTRACT_ADDRESS=your_deployed_escrow_address
   TOKEN_ADDRESS=your_deployed_token_address
   ```

3. **Mint Tokens:**
   ```bash
   npm run mint-env
   ```

4. **Test Escrow:**
   ```bash
   npm run escrow
   ```

## 📊 Available Scripts

```bash
# Mint tokens using environment variables
npm run mint-env

# Test atomic swap escrow
npm run escrow

# Install dependencies
npm run install-deps
```

## 🔧 Script Details

### script/mint.js
- Loads configuration from environment variables
- Validates required variables
- Mints tokens to specified recipient
- Displays token information and balances

### test/escrow.js
- Generates random order IDs and secrets
- Creates escrow with specified parameters
- Tests secret revelation by taker
- Provides detailed transaction logging

## 🔐 Security Features

- **Environment-based configuration** - No hardcoded secrets
- **Private key validation** - Verifies key/address pairs
- **Random generation** - Unique order IDs and secrets for each test
- **Comprehensive error handling** - Detailed error messages
- **Transaction confirmation** - Waits for blockchain confirmations

## 🌐 Network Information

- **Testnet:** Shasta (Shasta.trongrid.io)
- **Mainnet:** TRON Mainnet (api.trongrid.io)
- **Block Explorer:** [Shasta Tronscan](https://shasta.tronscan.org/)

## 🐛 Troubleshooting

### Common Issues

1. **"Insufficient energy" error:**
   - Increase feeLimit in script configuration
   - Ensure sufficient TRX balance

2. **"Only owner can call this function":**
   - Check if you're using the correct private key
   - Verify contract ownership

3. **"Network error":**
   - Check internet connection
   - Verify RPC URL in environment

4. **"Missing environment variables":**
   - Ensure all required variables are set in `.env`
   - Check variable names and values


**Happy Swapping! 🚀**
