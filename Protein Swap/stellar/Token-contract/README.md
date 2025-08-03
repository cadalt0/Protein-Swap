# UNITE V2 Token Contract

## Contract Information

**Deployed Contract ID:** `CB6PE3CR6PTIJXJROA3TGAYI4ALLMBNLQPMCY7X3RRSU2DEKUEAAD2OZ`

**Explorer Link:** [View on Stellar Explorer](https://stellar.expert/explorer/testnet/contract/CB6PE3CR6PTIJXJROA3TGAYI4ALLMBNLQPMCY7X3RRSU2DEKUEAAD2OZ)

## Prerequisites

Before building and deploying this contract, you need to install:

- **WSL (Windows Subsystem for Linux)** - Required for running Linux commands on Windows
- **Stellar CLI** - The official Stellar command-line interface

## Setup Instructions

### 1. Create a Wallet Key

Generate a new wallet key for testing:

```bash
stellar keys generate --global test-1 --network testnet --fund
```

### 2. Fund Your Wallet

Fund your newly created wallet:

```bash
stellar keys fund test-1
```

## Build and Deploy

### 3. Build the Contract

Build the contract using the Stellar CLI:

```bash
stellar contract build
```

### 4. Deploy the Contract

Deploy the contract to the testnet:

```bash
stellar contract deploy --network testnet --source-account test-1 --wasm target/wasm32v1-none/release/unite_v2_token.wasm
```

**Note:** If you changed the wallet name from `test-1`, make sure to update it in the command above.

## Usage

### 5. Mint Tokens

Mint tokens to your address:

```bash
stellar contract invoke --network testnet --source-account test-1 --id CB6PE3CR6PTIJXJROA3TGAYI4ALLMBNLQPMCY7X3RRSU2DEKUEAAD2OZ -- mint --to <your-address-here> --amount 10000000000000000
```

Replace `<your-address-here>` with your actual Stellar address.

## Contract Features

- **Open Minting:** Anyone can mint tokens (no admin restrictions)
- **Token Name:** UNITE V2
- **Token Symbol:** UNITEV2
- **Decimals:** 7
- **Network:** Testnet

## Important Notes

- This contract allows **anyone to mint tokens** without restrictions
- The contract is deployed on the **Stellar testnet**
- Make sure to replace wallet names and addresses as needed
- The contract ID is hardcoded for this specific deployment 