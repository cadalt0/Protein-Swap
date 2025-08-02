# UNITE Atomic Swap Escrow - Ethereum Smart Contracts

A  atomic swap escrow system built on Base Sepolia testnet using Solidity smart contracts.

## 📋 Overview

This project implements atomic swap functionality through smart contracts that allow secure peer-to-peer token exchanges using hash time-locked contracts (HTLCs).

## 🚀 Quick Start

### Installation

Install all dependencies using npm with legacy peer deps flag:

```bash
npm install --legacy-peer-deps
```

### Build

Compile the smart contracts:

```bash
npx hardhat compile
```

## 📦 Deployed Contracts (Base Sepolia)

All contracts are deployed and verified on Base Sepolia testnet:

### 🪙 UNITE Token (Mock ERC-20)
- **Address**: [`0xd61cbe5f41234c74e770757cd029a26eaf086b7b`](https://sepolia.basescan.org/address/0xd61cbe5f41234c74e770757cd029a26eaf086b7b)
- **Symbol**: UNITE
- **Decimals**: 18
- **Type**: Mock ERC-20 token for testing
- **Minting**: Anyone can mint tokens (no restrictions)

#### 🪙 Get UNITE Tokens
Need UNITE tokens for testing? Simply run:
```bash
npm run mint
```
This will mint 1000 UNITE tokens to the caller's wallet address (derived from `PRIVATE_KEY`). Make sure your `.env` file is configured with `PRIVATE_KEY`, `RPC_URL`, and `UNITE_TOKEN_ADDRESS`.

### 🔄 Atomic Swap Escrow Contract
- **Address**: [`0x2770026b1e73EeA780780Eb1179f22aC3C330eff`](https://sepolia.basescan.org/address/0x2770026b1e73EeA780780Eb1179f22aC3C330eff)
- **Purpose**: Main escrow contract for atomic swaps

### 🌉 Atomic Swap Escrow Dest Contract
- **Address**: [`0x7bE87d8b7045ED8c77b58586F568711d9Ca32e5d`](https://sepolia.basescan.org/address/0x7bE87d8b7045ED8c77b58586F568711d9Ca32e5d)
- **Purpose**: Destination escrow contract for cross-chain swaps

## ⚙️ Configuration

### Environment Setup

Create a `.env` file in the root directory with your configuration:

```env
# Required: Owner's private key (without 0x prefix) - creates and funds escrow
PRIVATE_KEY=your_private_key_here

# Required: Taker's address - receives tokens when escrow is unlocked
TAKER_ADDRESS=your_taker_address_here

# Required: Taker's private key (without 0x prefix) - unlocks escrow by revealing secret
TAKER_PRIVATE_KEY=your_taker_private_key_here

# Required: RPC URL for Base Sepolia
RPC_URL=https://sepolia.base.org

# Required: For deployed contract testing
UNITE_TOKEN_ADDRESS=0xd01f39dB900DDBbE3cd918b353528bC0D68F888a
ESCROW_ADDRESS=0x2770026b1e73EeA780780Eb1179f22aC3C330eff
```

⚠️ **Security Note**: Never commit your `.env` file or expose your private keys!

💡 **Testing Tip**: For testing purposes, you can generate two different wallets:
- **Owner wallet**: Creates and funds the escrow
- **Taker wallet**: Claims tokens by revealing the secret

You can create new wallets using ethers.js or any wallet generator. Make sure:
- Both wallets have some ETH for gas fees
- `TAKER_ADDRESS` matches the address derived from `TAKER_PRIVATE_KEY` (the script will verify this automatically)

## 🛠️ Deployment Scripts

### Option 1: Deploy Contracts Only

Deploy all smart contracts to Base Sepolia:

```bash
npx hardhat run scripts/deploy.ts
```

**What it does:**
- Deploys UNITE token contract
- Deploys AtomicSwapEscrow contract  
- Deploys AtomicSwapEscrowDest contract
- Prints all contract addresses and explorer links

### Option 2: Deploy + Mint Tokens

Deploy contracts and mint 1000 UNITE tokens to caller:

```bash
npx hardhat run scripts/deploy-and-mint.ts
```

**What it does:**
- Everything from Option 1
- Mints 1000 UNITE tokens to caller address
- Shows final token balance
- Provides mint transaction link

## 🧪 Testing

### Test 1: Using Deployed Contracts

Test with existing deployed contracts using proper atomic swap flow where taker unlocks the escrow:

```bash
npx hardhat run test/create-and-unlock-deployed-escrow.ts
```

**Prerequisites:**
- Set `PRIVATE_KEY`, `TAKER_ADDRESS`, `TAKER_PRIVATE_KEY`, `UNITE_TOKEN_ADDRESS`, and `ESCROW_ADDRESS` in `.env`
- Have UNITE tokens in the owner's wallet (run `npm run mint` to get 1000 UNITE tokens)
- Have some ETH for gas fees in both owner and taker wallets

**💡 Need UNITE tokens?** Run `npm run mint` to get 1000 tokens for testing!

**What it does:**
- **Owner** creates an escrow with 100 UNITE tokens and generates a secret hash
- **Owner** deposits tokens into the escrow contract
- **Taker** unlocks escrow by revealing the secret using their private key
- Tokens are transferred to the taker address
- Shows balances for both owner and taker before and after the swap

### Test 2: Full End-to-End Test

Complete automated test that deploys everything fresh:

```bash
npx hardhat run test/test-full.ts
```

**What it does:**
- Deploys all contracts from scratch
- Mints tokens to deployer
- Creates a new taker wallet
- Performs complete escrow cycle
- Shows all transaction links
- Displays final balances

## 📖 Contract Features

### UNITE Token Contract
- Standard ERC-20 implementation
- Mintable by owner
- Burnable by token holders
- 18 decimal places

### Atomic Swap Escrow Contract
- Hash time-locked contracts (HTLC)
- Secure peer-to-peer token swaps between owner and taker
- Timelock protection for failed swaps
- Secret-based unlocking mechanism

### Key Functions:
- `createEscrow()` - **Owner** locks tokens with secret hash
- `revealSecret()` - **Taker** unlocks tokens by revealing the secret
- `cancelEscrow()` - **Owner** cancels after timelock expires (if taker doesn't claim)
- `getEscrow()` - View escrow details

### Atomic Swap Flow:
1. **Owner** creates escrow with tokens and secret hash
2. **Taker** reveals the secret to claim the tokens
3. Smart contract automatically transfers tokens to taker
4. If taker doesn't reveal secret before timelock, owner can cancel and reclaim tokens

## 🌐 Network Information

### Base Sepolia Testnet
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Explorer**: https://sepolia.basescan.org
- **Faucet**: [Get testnet ETH](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)

## 📁 Project Structure

```
Eth/
├── contracts/              # Solidity smart contracts
│   ├── UNITEV1Token.sol    # ERC-20 token contract
│   ├── AtomicSwapEscrow.sol # Main escrow contract
│   └── AtomicSwapEscrowDest.sol # Destination escrow
├── scripts/                # Deployment scripts
│   ├── deploy.ts          # Deploy contracts only
│   └── deploy-and-mint.ts # Deploy + mint tokens
├── test/                   # Test scripts
│   ├── create-and-unlock-deployed-escrow.ts # Test with deployed contracts
│   └── test-full.ts       # Full end-to-end test
├── .env.example           # Environment template
├── hardhat.config.ts      # Hardhat configuration
└── README.md              # This file
```

## 🔧 Development

### Compile Contracts
```bash
npx hardhat compile
```

### Run Tests
```bash
npx hardhat test
```

### Clean Build
```bash
npx hardhat clean
```


## ⚠️ Disclaimer

This is testnet software for educational and development purposes. Do not use with real funds on mainnet without proper auditing.


**Happy Building! 🚀**