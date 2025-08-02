# Aptos Atomic Swap Contract

A secure atomic swap implementation on Aptos blockchain supporting any FA (Fungible Asset) tokens with hashlock and timelock mechanisms.

## 🚀 Deployed Contracts

### Testnet Deployment
- **Network**: Aptos Testnet
- **Deployer Address**: [`0x628211229e8410b08ff89a9fbb2487b8192345adc97d0bc8d4416bb62d591c59`](https://explorer.aptoslabs.com/account/0x628211229e8410b08ff89a9fbb2487b8192345adc97d0bc8d4416bb62d591c59?network=testnet)

### Deployed Modules
- **Mock Token**: [`0x628211229e8410b08ff89a9fbb2487b8192345adc97d0bc8d4416bb62d591c59::A3mock_token::MockToken`](https://explorer.aptoslabs.com/account/0x628211229e8410b08ff89a9fbb2487b8192345adc97d0bc8d4416bb62d591c59?network=testnet)
- **Atomic Swap Contract**: [`0x628211229e8410b08ff89a9fbb2487b8192345adc97d0bc8d4416bb62d591c59::fusion_swap_v3_coin`](https://explorer.aptoslabs.com/account/0x628211229e8410b08ff89a9fbb2487b8192345adc97d0bc8d4416bb62d591c59?network=testnet)

## 📋 Prerequisites

- Node.js (v16 or higher)
- Aptos CLI installed globally
- Aptos testnet account with APT tokens

## 🛠️ Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Contracts
```bash
cd contract
aptos move compile
```

### 3. Configure Environment

Create a `.env` file in the root directory:

```env
# Required for all operations
PRIVATE_KEY=0xyour_private_key_here
ACCOUNT_ADDRESS=0xyour_account_address_here
RPC_URL=https://aptos-testnet.public.blastapi.io

# Required for escrow testing
TAKER_PRIVATE_KEY=0xtaker_private_key_here
TAKER_ADDRESS=0xtaker_address_here
CONTRACT_ADDRESS=0x628211229e8410b08ff89a9fbb2487b8192345adc97d0bc8d4416bb62d591c59
```

### 4. Update Configuration Files

#### Update Move.toml
Edit `contract/Move.toml` and change the deployer address:
```toml
[addresses]
fusion_swap_addr = "0xYOUR_DEPLOYER_ADDRESS_HERE"
```

#### Update deployment-info.json
Edit `deployment-info.json` and update the account address:
```json
{
  "network": "testnet",
  "accountAddress": "0xYOUR_DEPLOYER_ADDRESS_HERE",
  "objectAddress": "unknown",
  "transactionHash": "unknown",
  "deployedAt": "2025-07-21T00:10:21.360Z",
  "modules": [
    "0xYOUR_DEPLOYER_ADDRESS_HERE::mock_token",
    "0xYOUR_DEPLOYER_ADDRESS_HERE::atomic_swap"
  ]
}
```

## 🚀 Deployment

### Deploy Contracts Only
```bash
npm run deploy
```

This will:
- Deploy the atomic swap contract
- Deploy the mock token contract
- Use environment variables for authentication


## 🧪 Testing

There are two testing approaches available:

### Test 1: Test on Deployed Address (Recommended)

This approach uses the already deployed contracts on testnet.

#### Step 1: Mint Tokens
```bash
npm run mint
```
This mints 1000 MockTokens to your account address.

#### Step 2: Run Escrow Test
```bash
npm run test:escrow
```

**What this test does:**
- Creates an escrow with 5000 MockTokens
- Uses auto-generated order ID and secret
- Waits 5 seconds after escrow creation
- Reveals secret from taker wallet
- Includes retry logic for failed transactions
- Uses environment variables for all sensitive data

**Required Environment Variables:**
- `PRIVATE_KEY` - Escrow creator's private key
- `ACCOUNT_ADDRESS` - Escrow creator's address
- `TAKER_PRIVATE_KEY` - Taker's private key
- `TAKER_ADDRESS` - Taker's address
- `CONTRACT_ADDRESS` - Deployed contract address
- `RPC_URL` - Aptos RPC endpoint

### Test 2: Full A-Z Test (Deploy + Test)

This approach deploys new contracts and then tests them.

#### Step 1: Update Configuration
1. Update `contract/Move.toml` with your deployer address
2. Update `deployment-info.json` with your deployer address
3. Fill `.env` with your private key only

#### Step 2: Run Full Test
```bash
npm run test:full
```

**What this test does:**
- Deploys contracts using your private key
- Mints 10000 MockTokens to your address
- Generates a new random taker wallet
- Creates an escrow with 5000 tokens
- Unlocks escrow as contract owner
- Includes retry logic (2 retries, 3-second gaps)
- Adds 2-3 second delays between actions
- Auto-approves all transactions

**Required Environment Variables:**
- `PRIVATE_KEY` - Your deployer private key
- `RPC_URL` - Aptos RPC endpoint (optional, defaults to testnet)

## 📊 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run deploy` | Deploy contracts to testnet |
| `npm run mint` | Mint 1000 MockTokens |
| `npm run test:escrow` | Test escrow on deployed contracts |
| `npm run test:full` | Full A-Z test (deploy + test) |


## 🔧 Contract Features

### Generic Token Support
- Supports **any FA token** (not just native APT)
- Uses generic `CoinType` parameters
- Compatible with all Aptos fungible assets

### Security Features
- **Hashlock**: SHA3-256 hash-based locking
- **Timelock**: Configurable expiry times
- **Atomic**: Either both parties succeed or both fail
- **Trustless**: No third-party intermediaries

### Escrow States
- `CREATED` (0): Escrow created, waiting for taker
- `COMPLETED` (1): Escrow successfully completed
- `CANCELLED` (2): Escrow cancelled by owner
- `EXPIRED` (3): Escrow expired due to timelock



## 🐛 Troubleshooting

### Common Issues

1. **"Command failed" errors**
   - Ensure Aptos CLI is installed globally
   - Check your private key format (should start with 0x)
   - Verify RPC URL is accessible

2. **"Missing environment variable"**
   - Create `.env` file with required variables
   - Don't use placeholder values

3. **"Transaction failed"**
   - Ensure account has sufficient APT for gas
   - Check network connectivity
   - Verify contract addresses are correct




**⚠️ Important**: This is a testnet implementation. For production use, conduct thorough security audits and testing.
