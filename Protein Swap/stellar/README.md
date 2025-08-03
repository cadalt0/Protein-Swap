# Atomic Swap Escrow Script

This script demonstrates atomic swap escrow functionality using Stellar Soroban smart contracts.

## Deployed Contracts

### Token Contract
- **Contract ID:** `CB6PE3CR6PTIJXJROA3TGAYI4ALLMBNLQPMCY7X3RRSU2DEKUEAAD2OZ`
- **Explorer:** [View on Stellar Explorer](https://stellar.expert/explorer/testnet/contract/CB6PE3CR6PTIJXJROA3TGAYI4ALLMBNLQPMCY7X3RRSU2DEKUEAAD2OZ)
- **README:** [Token Contract Documentation](../Token-contract/README.md)

### Escrow Contract
- **Contract ID:** `CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB`
- **Explorer:** [View on Stellar Explorer](https://stellar.expert/explorer/testnet/contract/CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB)
- **README:** [Escrow Contract Documentation](../escrow-contract/README.md)

## Prerequisites

- **Node.js** (version 18 or higher)
- **WSL (Windows Subsystem for Linux)** - Required for running Linux commands on Windows
- **Stellar CLI** - The official Stellar command-line interface

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Copy environment template:**
   ```bash
   cp env.sample .env
   ```

3. **Edit the .env file** with your configuration (see Configuration section below)

## Configuration

Edit your `.env` file with the following variables:

```env
# Contract IDs (already set to deployed contracts)
ESCROW_CONTRACT_ID=CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB
TOKEN_CONTRACT_ID=CB6PE3CR6PTIJXJROA3TGAYI4ALLMBNLQPMCY7X3RRSU2DEKUEAAD2OZ

# RPC URL (optional - defaults to testnet)
RPC_URL=https://soroban-testnet.stellar.org:443

# Owner (Escrow Creator) Private Key
# This is the private key of the person creating the escrow
# Generate your own: stellar keys generate --global owner-wallet --network testnet --fund
OWNER_PRIVATE_KEY=YOUR_OWNER_PRIVATE_KEY_HERE

# Taker Private Key
# This is the private key of the person who will reveal the secret
# Generate your own: stellar keys generate --global taker-wallet --network testnet --fund
TAKER_PRIVATE_KEY=YOUR_TAKER_PRIVATE_KEY_HERE

# Taker Address
# This is the public address of the taker
# Get from: stellar keys show taker-wallet
TAKER_ADDRESS=YOUR_TAKER_ADDRESS_HERE

# Optional Parameters (will be auto-generated if not provided)
# Order ID (will be auto-generated if not provided)
ORDER_ID=order123

# Secret (will be auto-generated if not provided)
SECRET=mysecret123

# Amount in tokens (default: 100)
AMOUNT=100

# Timelock duration in seconds (default: 3600 = 1 hour)
TIMELOCK_DURATION=3600
```

## Testing Options

### Option 1: Test with Deployed Contracts (Recommended)

Use the already deployed contracts with your own wallet keys:

1. **Generate your own wallet keys:**
   ```bash
   stellar keys generate --global owner-wallet --network testnet --fund
   stellar keys generate --global taker-wallet --network testnet --fund
   ```

2. **Fund your wallets:**
   ```bash
   stellar keys fund owner-wallet
   stellar keys fund taker-wallet
   ```

3. **Get your private keys and addresses:**
   ```bash
   stellar keys show owner-wallet
   stellar keys show taker-wallet
   ```

4. **Update your .env file** with the generated keys and addresses

5. **Run the script:**
   ```bash
   npm start
   ```

### Option 2: Deploy Fresh Contracts

If you want to deploy your own contracts:

1. **Deploy Token Contract:**
   - Follow the [Token Contract README](../Token-contract/README.md)
   - Update `TOKEN_CONTRACT_ID` in your .env file

2. **Deploy Escrow Contract:**
   - Follow the [Escrow Contract README](../escrow-contract/README.md)
   - Update `ESCROW_CONTRACT_ID` in your .env file

3. **Run the script:**
   ```bash
   npm start
   ```

## Script Flow

The script performs the following steps:

1. **Validates** environment variables
2. **Creates escrow** using owner's private key
3. **Waits 5 seconds** for transaction confirmation
4. **Reveals secret** using taker's private key
5. **Verifies** escrow completion

## Expected Output

```
🚀 Atomic Swap Escrow Script
Contract ID: CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB
Token ID: CB6PE3CR6PTIJXJROA3TGAYI4ALLMBNLQPMCY7X3RRSU2DEKUEAAD2OZ
Owner Address: G...
Taker Address: G...
Order ID: order123
Secret: mysecret123
Amount: 100 tokens
Timelock Duration: 3600 seconds

🔒 Creating escrow with specified parameters...

🎯 Escrow Parameters:
- Order ID: order123
- Secret: mysecret123
- Hash: a1b2c3d4...
- Amount: 100 tokens
- Timelock Duration: 3600 seconds
- Owner: G...
- Taker: G...

📤 Invoking create_escrow on contract CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB...
🔍 Simulating transaction...
✅ Simulation successful
📡 Submitting transaction...
✅ Transaction submitted: abc123...
⏳ Waiting for confirmation...
🎉 Transaction confirmed!

✅ Escrow creation result: Transaction successful

🔍 Verifying escrow exists...
Escrow exists: true
🎉 SUCCESS! Escrow created with:
  - Order ID: order123
  - Amount: 100 tokens locked
  - Secret: mysecret123
  - Taker: G...

⏰ Waiting 5 seconds...

🔓 Taker revealing secret to unlock escrow...

📤 Taker calling reveal_secret...
- Caller (Taker): G...
- Order ID: order123
- Original Owner: G...
- Secret: mysecret123

📤 Invoking reveal_secret on contract CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB...
🔍 Simulating transaction...
✅ Simulation successful
📡 Submitting transaction...
✅ Transaction submitted: def456...
⏳ Waiting for confirmation...
🎉 Transaction confirmed!

✅ Secret revealed successfully!
Result: Transaction successful

🔍 Checking if escrow is still active...
Escrow still active: false
🎉 SUCCESS! Taker successfully unlocked the escrow!
💰 Tokens have been transferred to taker: G...
```

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Make sure all required variables are set in your `.env` file
   - Check that private keys and addresses are correct

2. **"Simulation error"**
   - Ensure you have sufficient XLM in your wallet for fees
   - Verify contract IDs are correct
   - Check that you have tokens to lock in escrow

3. **"Transaction failed on blockchain"**
   - Check your wallet has enough XLM for fees
   - Verify your private keys are correct
   - Ensure you have the tokens you're trying to lock

### Getting Help

- **Token Contract Issues:** See [Token Contract README](../Token-contract/README.md)
- **Escrow Contract Issues:** See [Escrow Contract README](../escrow-contract/README.md)
- **Stellar CLI Issues:** Check [Stellar Documentation](https://developers.stellar.org/)


## Contract Features

- **Atomic Swap Escrow:** Secure token exchange with hashlock and timelock mechanisms
- **Hashlock Protection:** Uses SHA-256 hash verification for secret revelation
- **Timelock Mechanism:** Automatic cancellation after time expiry
- **Multi-Party Support:** Supports different owners and takers
- **Event Logging:** Comprehensive event tracking for all operations 