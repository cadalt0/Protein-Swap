# Token Deployment and Minting Scripts with Environment Variables

These scripts are modified versions of the original `deploy-token.js` and `mint-tokens.js` that load all configuration from environment variables instead of hardcoded values.

## Features

- ✅ Environment-based configuration
- ✅ Configuration validation
- ✅ Detailed logging and error handling
- ✅ Optional token minting
- ✅ Network flexibility (testnet/mainnet)
- ✅ Customizable gas limits and deposits

## Setup

### 1. Install Dependencies

Make sure you have the required dependencies installed:

```bash
npm install dotenv near-api-js
```

### 2. Create Environment File

Copy the example environment file and configure it with your values:

```bash
cp env.example .env
```

### 3. Configure Environment Variables

Edit the `.env` file with your actual values:

```env
# NEAR Network Configuration
NEAR_NETWORK_ID=testnet
NEAR_NODE_URL=https://rpc.testnet.near.org

# Account Configuration
OWNER_ACCOUNT_ID=your-owner-account.testnet
TOKEN_ACCOUNT_ID=your-token-account.testnet

# Private Keys (ed25519 format)
OWNER_PRIVATE_KEY=ed25519:your-owner-private-key-here
TOKEN_PRIVATE_KEY=ed25519:your-token-private-key-here

# Contract Configuration
WASM_PATH=./target/near/v1tokens.wasm
TOTAL_SUPPLY=1000000000000000000000000
GAS_LIMIT=300000000000000
ATTACHED_DEPOSIT=0

# Optional Minting Configuration
ENABLE_MINTING=false
MINT_AMOUNT=100000000000000000000000
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OWNER_ACCOUNT_ID` | Your NEAR account ID | `bigseal2466.testnet` |
| `TOKEN_ACCOUNT_ID` | The token contract account ID | `unite.bigseal2466.testnet` |
| `OWNER_PRIVATE_KEY` | Your account's private key | `ed25519:4UuecPKeSFkJwQA7...` |
| `TOKEN_PRIVATE_KEY` | Token contract's private key | `ed25519:7s75gRMGUNQMUCmq...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEAR_NETWORK_ID` | NEAR network (testnet/mainnet) | `testnet` |
| `NEAR_NODE_URL` | NEAR RPC endpoint | `https://rpc.testnet.near.org` |
| `WASM_PATH` | Path to the compiled WASM file | `./target/near/v1tokens.wasm` |
| `TOTAL_SUPPLY` | Initial token supply | `1000000000000000000000000` |
| `GAS_LIMIT` | Gas limit for transactions | `300000000000000` |
| `ATTACHED_DEPOSIT` | NEAR deposit for deployment | `0` |
| `ENABLE_MINTING` | Enable automatic minting | `false` |
| `MINT_AMOUNT` | Amount to mint if enabled | `100000000000000000000000` |

## Usage

### Deploy Token Contract

```bash
node deploy-token-env.js
```

### With Custom Environment File

```bash
ENV_FILE=.env.production node deploy-token-env.js
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit your `.env` file** - Add it to `.gitignore`
2. **Keep private keys secure** - Store them in a secure location
3. **Use different keys for different environments** - Don't reuse production keys in testnet
4. **Rotate keys regularly** - Update your private keys periodically

## Example .gitignore Entry

```
# Environment files
.env
.env.local
.env.production
.env.staging
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Ensure all required variables are set in your `.env` file
   - Check the validation output for missing variables

2. **WASM File Not Found**
   - Verify the `WASM_PATH` points to the correct location
   - Build the contract first: `cargo build --target wasm32-unknown-unknown --release`

3. **Network Connection Issues**
   - Check your internet connection
   - Verify the `NEAR_NODE_URL` is correct
   - Try switching between testnet and mainnet endpoints

4. **Account Issues**
   - Ensure accounts exist on the specified network
   - Verify private keys match the account IDs
   - Check account balances for gas fees

## Script Output

The script provides detailed logging:

```
✅ All required environment variables are set
📋 Current Configuration:
   Network ID: testnet
   Node URL: https://rpc.testnet.near.org
   Token Account: unite.bigseal2466.testnet
   Owner Account: bigseal2466.testnet
   WASM Path: ./target/near/v1tokens.wasm
   Total Supply: 1000000000000000000000000
   Gas Limit: 300000000000000
   Attached Deposit: 0

🚀 Starting token contract deployment...
📡 Network: testnet
🔗 Node URL: https://rpc.testnet.near.org
🏗️ Token Account: unite.bigseal2466.testnet
👤 Owner Account: bigseal2466.testnet
📖 Reading WASM file from: ./target/near/v1tokens.wasm
📦 Deploying contract...
✅ Contract deployed successfully!
Transaction hash: 2xQ...
🔧 Initializing contract...
✅ Contract initialized successfully!
Initialization transaction hash: 3yR...
🔍 Verifying deployment...
📊 Token Metadata: { name: 'My Token', symbol: 'MTK', ... }
💰 Total Supply: 1000000000000000000000000
🎉 Token deployment completed successfully!
Token Contract: unite.bigseal2466.testnet
Owner: bigseal2466.testnet
``` 