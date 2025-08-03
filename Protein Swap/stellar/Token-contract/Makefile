.PHONY: build build-release test clean format check-fmt clippy

# Build the contract
build:
	cargo build --target wasm32-unknown-unknown

# Build the contract in release mode
build-release:
	cargo build --target wasm32-unknown-unknown --release

# Run tests
test:
	cargo test

# Clean build artifacts
clean:
	cargo clean

# Format code
format:
	cargo fmt

# Check formatting
check-fmt:
	cargo fmt -- --check

# Run clippy
clippy:
	cargo clippy --target wasm32-unknown-unknown

# Optimize WASM file
optimize: build-release
	soroban contract optimize --wasm target/wasm32-unknown-unknown/release/unite_v1_token.wasm

# Deploy to testnet (requires stellar CLI and funded account)
deploy-testnet: optimize
	@echo "Deploying UNITE V1 token to testnet..."
	@echo "Make sure you have a funded testnet account and stellar CLI installed"
	@echo "Usage: stellar contract deploy --network testnet --source-account YOUR_SECRET_KEY --wasm target/wasm32-unknown-unknown/release/unite_v1_token_optimized.wasm"

# Initialize token on testnet (after deployment)
init-testnet:
	@echo "Initializing UNITE V1 token..."
	@echo "Usage: stellar contract invoke --network testnet --source-account YOUR_SECRET_KEY --id CONTRACT_ID -- __constructor --admin ADMIN_ADDRESS"

# Mint tokens on testnet
mint-testnet:
	@echo "Minting UNITE V1 tokens..."
	@echo "Usage: stellar contract invoke --network testnet --source-account ADMIN_SECRET_KEY --id CONTRACT_ID -- mint --to RECIPIENT_ADDRESS --amount AMOUNT"

# Transfer tokens on testnet
transfer-testnet:
	@echo "Transferring UNITE V1 tokens..."
	@echo "Usage: stellar contract invoke --network testnet --source-account FROM_SECRET_KEY --id CONTRACT_ID -- transfer --from FROM_ADDRESS --to TO_ADDRESS --amount AMOUNT"

# Get token balance on testnet
balance-testnet:
	@echo "Getting UNITE V1 token balance..."
	@echo "Usage: stellar contract invoke --network testnet --source-account ANY_SECRET_KEY --id CONTRACT_ID -- balance --id ADDRESS"

# Get token info on testnet
info-testnet:
	@echo "Getting UNITE V1 token info..."
	@echo "Usage: stellar contract invoke --network testnet --source-account ANY_SECRET_KEY --id CONTRACT_ID -- name"
	@echo "Usage: stellar contract invoke --network testnet --source-account ANY_SECRET_KEY --id CONTRACT_ID -- symbol"
	@echo "Usage: stellar contract invoke --network testnet --source-account ANY_SECRET_KEY --id CONTRACT_ID -- decimals" 