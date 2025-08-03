# Atomic Swap Escrow System

A  atomic swap escrow system built on Monad testnet for secure token Swap.

## 🚀 Deployed Contracts

### Atomic Swap Escrow Contract
- **Address**: `0xE40a04c8A63b598fC320CD0D8F1C432026b9F5F1`
- **Explorer**: [View on Monad Explorer](https://testnet.monadexplorer.com/address/0xE40a04c8A63b598fC320CD0D8F1C432026b9F5F1)

### UNITE V1 Token Contract
- **Address**: `0xbc9bc0e9d12c4d22ba1d7e0330ef822a8da2f7db`
- **Explorer**: [View on Monad Explorer](https://testnet.monadexplorer.com/address/0xbc9bc0e9d12c4d22ba1d7e0330ef822a8da2f7db)

## 📋 Prerequisites

- [MetaMask](https://metamask.io/) wallet
- Monad testnet configured in MetaMask
- [Remix IDE](https://remix.ethereum.org/) for contract deployment

## 🔧 Setup Instructions

### 1. Configure MetaMask for Monad Testnet

Add Monad testnet to your MetaMask:

**Network Details:**
- **Network Name**: Monad Testnet
- **RPC URL**: 
- **Chain ID**: `1337`
- **Currency Symbol**: `MONAD`
- **Block Explorer**: `https://testnet.monadexplorer.com`

### 2. Get Testnet MONAD

Visit the [Monad Faucet](https://faucet.monad.xyz/) to get testnet MONAD tokens.

## 🚀 Contract Deployment

### Option 1: Deploy Your Own Contracts

1. **Go to [Remix IDE](https://remix.ethereum.org/)**

2. **Upload Contracts:**
   - Upload `Contract/AtomicSwapEscrow.sol`
   - Upload `Contract/UNITEV1Token.sol` (or create your own token)

3. **Compile Contracts:**
   - Select Solidity compiler version `0.8.20`
   - Compile both contracts

4. **Deploy Contracts:**
   - Switch to "Deploy & Run Transactions" tab
   - Connect your MetaMask wallet
   - Deploy both contracts
   - **Save both contract addresses!**

### Option 2: Use Pre-deployed Contracts

Use the addresses provided above for testing.

## 🧪 Testing

### Test Method 1: Using Pre-deployed Contracts

#### Step 1: Mint Tokens

1. **Setup Environment:**
   ```bash
   cp scripts/env.example scripts/.env
   ```

2. **Configure `.env` for minting:**
   ```bash
   RPC_URL=
   TOKEN_ADDRESS=0xbc9bc0e9d12c4d22ba1d7e0330ef822a8da2f7db
   PRIVATE_KEY=your_private_key_here
   MINT_AMOUNT=1000
   ```

3. **Install Dependencies:**
   ```bash
   cd scripts
   npm install
   ```

4. **Run Mint Script:**
   ```bash
   node scripts/mint.js
   ```

#### Step 2: Test Atomic Swap

1. **Update `.env` for escrow:**
   ```bash
   RPC_URL=
   ESCROW_CONTRACT_ADDRESS=0xE40a04c8A63b598fC320CD0D8F1C432026b9F5F1
   ERC20_TOKEN_ADDRESS=0xbc9bc0e9d12c4d22ba1d7e0330ef822a8da2f7db
   OWNER_PRIVATE_KEY=your_owner_private_key_here
   TAKER_PRIVATE_KEY=your_taker_private_key_here
   TAKER_ADDRESS=0xYourTakerAddressHere
   TOKEN_AMOUNT=10
   TIMELOCK_DURATION=3600
   ```

2. **Run Escrow Script:**
   ```bash
   node scripts/escrow.js
   ```

### Test Method 2: Fresh Deployment

1. **Deploy your own token contract** on [Remix](https://remix.ethereum.org/)
2. **Update the token address** in your `.env` file
3. **Run the escrow script** with your new token address

## 📁 Project Structure

```
Monad/
├── Contract/
│   └── AtomicSwapEscrow.sol    # Main escrow contract
├── scripts/
│   ├── escrow.js               # Atomic swap testing script
│   ├── mint.js                 # Token minting script
│   ├── package.json            # Dependencies
│   └── .env.example           # Environment template
└── README.md                   # This file
```

## 🔍 Script Features

### `mint.js`
- ✅ Mints tokens to your wallet address
- ✅ Retry logic for failed transactions
- ✅ Explorer links for all transactions
- ✅ Balance checking before/after minting

### `escrow.js`
- ✅ Creates atomic swap escrow
- ✅ Random order IDs and secrets for each run
- ✅ Taker reveals secret (not admin)
- ✅ Retry logic for all transactions
- ✅ Explorer links for verification
- ✅ Environment variable validation

## 🔐 Security Features

- **Timelock Protection**: Escrows can be cancelled after timelock expires
- **Hash Verification**: Secrets are verified using keccak256 hashing
- **Access Control**: Only authorized parties can interact with escrows
- **Random Generation**: Each test uses unique order IDs and secrets

## 🐛 Troubleshooting

### Common Issues:

1. **"Insufficient funds"** - Get more MONAD from faucet
2. **"Transaction failed"** - Check gas settings in MetaMask
3. **"Contract not found"** - Verify contract addresses
4. **"Invalid private key"** - Check your .env file format
