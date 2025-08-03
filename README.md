# 🧬 Protein Swap - Multi-Chain Atomic Swap Ecosystem

 <p align="center"> <img width="350" height="350" alt="image" src="https://github.com/user-attachments/assets/a13fd76c-f66f-4c07-a331-834b6abfb574" /> </p>


A comprehensive atomic swap implementation across **8 major blockchain platforms** with cross-chain testing capabilities. This project demonstrates secure, trustless token exchanges using Hash Time-Locked Contracts (HTLC) across different blockchain ecosystems.

## 🌟 Project Overview

Protein Swap is a complete atomic swap ecosystem that enables secure peer-to-peer token exchanges across multiple blockchain networks. Each implementation includes smart contracts, deployment scripts, testing frameworks, and comprehensive documentation.

### 🏗️ Supported Blockchains

| Blockchain | Language | Status | Testnet | Main Features |
|------------|----------|--------|---------|---------------|
| **Ethereum** | Solidity | ✅ Deployed | Base Sepolia | HTLC, ERC-20, Cross-chain |
| **Aptos** | Move | ✅ Deployed | Aptos Testnet | Generic FA tokens, SHA3-256 |
| **Sui** | Move | ✅ Deployed | Sui Testnet | Public minting, Treasury |
| **NEAR** | Rust | ✅ Deployed | NEAR Testnet | NEP-141, Open minting |
| **Stellar** | Rust | ✅ Deployed | Stellar Testnet | Soroban contracts, XLM support |
| **TRON** | Solidity | ✅ Deployed | Shasta Testnet | TRC-20, TRX support |
| **Monad** | Solidity | ✅ Deployed | Monad Testnet | EVM-compatible, High TPS |

## 📁 Project Structure

```
Protein Swap/
├── Eth/                    # Ethereum (Solidity) - Base Sepolia
│   ├── contracts/         # Smart contracts
│   ├── scripts/          # Deployment & interaction
│   ├── test/             # Test files
│   └── README.md         # Detailed documentation
├── Aptos/                 # Aptos (Move) - Testnet
│   ├── contract/         # Move contracts
│   ├── scripts/          # Deployment scripts
│   ├── test/             # Test files
│   └── README.md         # Documentation
├── sui/                   # Sui (Move) - Testnet
│   ├── sources/          # Move contracts
│   ├── script/           # Interaction scripts
│   ├── tests/            # Test files
│   └── README.md         # Documentation
├── Near/                  # NEAR Protocol (Rust) - Testnet
│   ├── Token-Contract/   # NEP-141 token
│   ├── Escrow-Contract/  # HTLC escrow
│   ├── escrow.js         # Demo script
│   └── README.md         # Documentation
├── stellar/               # Stellar (Rust) - Testnet
│   ├── Token-contract/   # Soroban token
│   ├── escrow-contract/  # HTLC escrow
│   ├── escrow.js         # Demo script
│   └── README.md         # Documentation
├── Tron/                  # TRON (Solidity) - Shasta Testnet
│   ├── contracts/        # Smart contracts
│   ├── script/           # Deployment scripts
│   ├── test/             # Test files
│   └── README.md         # Documentation
├── Monad/                 # Monad (Solidity) - Testnet
│   ├── Contract/         # Smart contracts
│   ├── scripts/          # Interaction scripts
│   └── README.md         # Documentation
└── README.md             # This file
```

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js** (v18 or higher)
- **Git** for cloning the repository
- **Blockchain-specific tools** (see individual READMEs)
- **Testnet accounts** with native tokens for gas fees

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/cadalt0/Protein-Swap.git
   cd Protein-Swap
   ```

2. **Install individual blockchain dependencies:**
   ```bash
   # Ethereum
   cd Eth && npm install --legacy-peer-deps
   
   # Aptos
   cd ../Aptos && npm install
   
   # Sui
   cd ../sui && npm install
   
   # NEAR
   cd ../Near && npm install
   
   # Stellar
   cd ../stellar && npm install
   
   # TRON
   cd ../Tron && npm install
   
   # Monad
   cd ../Monad/scripts && npm install
   ```

## 🔗 Deployed Contract Addresses

### Ethereum (Base Sepolia)
- **UNITE Token**: `0xd61cbe5f41234c74e770757cd029a26eaf086b7b`
- **Atomic Swap Escrow**: `0x2770026b1e73EeA780780Eb1179f22aC3C330eff`
- **Destination Escrow**: `0x7bE87d8b7045ED8c77b58586F568711d9Ca32e5d`

### Aptos (Testnet)
- **Mock Token**: `0x628211229e8410b08ff89a9fbb2487b8192345adc97d0bc8d4416bb62d591c59::A3mock_token::MockToken`
- **Atomic Swap**: `0x628211229e8410b08ff89a9fbb2487b8192345adc97d0bc8d4416bb62d591c59::fusion_swap_v3_coin`

### Sui (Testnet)
- **Package ID**: `0xf29cda5ed324ec0e2aa111354ae2c0e9213b58ced054ab08523da9f90c081b69`
- **Treasury Object**: `0xe5f587c8e044984b30da0030b410ad1c0fe2c4d0a96cdb501ede793252005e24`
- **Escrow Registry**: `0x0485911b67adfab1baae52d149aa0eed50db6ec1bdf6dfa24a94fa0e22eb95c1`

### NEAR (Testnet)
- **Token Contract**: `unite-defi.sickwheat5604.testnet`
- **Escrow Contract**: `escrow.sickwheat5604.testnet`

### Stellar (Testnet)
- **Token Contract**: `CB6PE3CR6PTIJXJROA3TGAYI4ALLMBNLQPMCY7X3RRSU2DEKUEAAD2OZ`
- **Escrow Contract**: `CAIEBIFHJVTKNRL2TMXMRA4E6LUC7QSSYUIDIVG6UCHW6OPW6KKK6LSB`

### TRON (Shasta Testnet)
- **UNITE Token**: `TK9yXMjtxHFxpFymQFbdbcZHJvWjSjP2Jc`
- **Atomic Swap Escrow**: `TTKDb3vVpQiyKJwSoNMJpCifRZEs4CnWUb`

### Monad (Testnet)
- **UNITE Token**: `0xbc9bc0e9d12c4d22ba1d7e0330ef822a8da2f7db`
- **Atomic Swap Escrow**: `0xE40a04c8A63b598fC320CD0D8F1C432026b9F5F1`

## 🧪 Testing Guide

### Individual Blockchain Testing

Each blockchain implementation includes comprehensive testing scripts:

#### Ethereum Testing
```bash
cd Eth
# Test with deployed contracts
npx hardhat run test/create-and-unlock-deployed-escrow.ts
# Full end-to-end test
npx hardhat run test/test-full.ts
```

#### Aptos Testing
```bash
cd Aptos
# Test with deployed contracts
npm run test:escrow
# Full deployment and test
npm run test:full
```

#### Sui Testing
```bash
cd sui
# Test escrow functionality
npm run test:escrow
# Mint tokens
npm run mint
```

#### NEAR Testing
```bash
cd Near
# Run atomic swap demo
node escrow.js
```

#### Stellar Testing
```bash
cd stellar
# Run escrow script
npm start
```

#### TRON Testing
```bash
cd Tron
# Test atomic swap
npm run escrow
# Mint tokens
npm run mint-env
```

#### Monad Testing
```bash
cd Monad/scripts
# Test escrow
node escrow.js
# Mint tokens
node mint.js
```



## 🔧 Configuration

### Environment Setup

Each blockchain requires specific environment configuration. See individual READMEs for detailed setup:

- **Ethereum**: `.env` with private keys and RPC URLs
- **Aptos**: `.env` with account addresses and private keys
- **Sui**: `.env` with package IDs and object addresses
- **NEAR**: `.env` with account IDs and private keys
- **Stellar**: `.env` with contract IDs and private keys
- **TRON**: `.env` with contract addresses and private keys
- **Monad**: `.env` with contract addresses and private keys

### Common Environment Variables

```env
# Network Configuration
RPC_URL=https://[network].org
PRIVATE_KEY=your_private_key_here

# Contract Addresses
TOKEN_ADDRESS=your_token_contract_address
ESCROW_ADDRESS=your_escrow_contract_address

# Testing Configuration
TAKER_ADDRESS=your_taker_address
TAKER_PRIVATE_KEY=your_taker_private_key
AMOUNT=1000000000000000000000
TIMELOCK_DURATION=3600
```

## 🛡️ Security Features

### Universal Security Mechanisms

- **Hash Time-Locked Contracts (HTLC)**: Cryptographic protection for all swaps
- **Timelock Protection**: Automatic refunds after expiration
- **Atomic Execution**: All-or-nothing transaction completion
- **Trustless Operation**: No third-party intermediaries
- **Secret Revelation**: Cryptographic proof of knowledge

### Blockchain-Specific Security

- **Ethereum**: SHA-256 hashing, ERC-20 standards
- **Aptos**: SHA3-256 hashing, generic FA token support
- **Sui**: Move language security, object-based architecture
- **NEAR**: Rust security, NEP-141 standards
- **Stellar**: Soroban security, XLM integration
- **TRON**: TRC-20 standards, TRX support
- **Monad**: EVM compatibility, high throughput

## 📊 Performance Comparison

| Blockchain | TPS | Finality | Gas Cost | Cross-Chain |
|------------|-----|----------|----------|-------------|
| **Ethereum** | ~15 | ~12s | High | ✅ |
| **Aptos** | ~30,000 | ~1s | Low | ✅ |
| **Sui** | ~100,000 | ~400ms | Low | ✅ |
| **NEAR** | ~100,000 | ~1s | Low | ✅ |
| **Stellar** | ~1,000 | ~5s | Very Low | ✅ |
| **TRON** | ~2,000 | ~3s | Low | ✅ |
| **Monad** | ~10,000 | ~1s | Low | ✅ |

## 🔄 Atomic Swap Flow

### Standard Flow (All Blockchains)

1. **Escrow Creation**
   - Owner deposits tokens into escrow contract
   - Provides cryptographic hash of secret
   - Sets taker address and timelock duration

2. **Secret Revelation**
   - Taker reveals the secret that matches the hash
   - Smart contract verifies the secret
   - Tokens are automatically transferred to taker

3. **Timeout Protection**
   - If secret isn't revealed before timelock expires
   - Owner can reclaim their escrowed tokens
   - Prevents permanent loss of funds



## 🛠️ Development Guide

### Adding New Blockchain Support

1. **Create blockchain directory**
2. **Implement smart contracts**
3. **Add deployment scripts**
4. **Create testing framework**
5. **Document in main README**

### Smart Contract Standards

- **Token Contracts**: Follow blockchain-specific standards (ERC-20, NEP-141, etc.)
- **Escrow Contracts**: Implement HTLC pattern with timelock
- **Security**: Use cryptographic hashing for secret verification
- **Testing**: Include comprehensive test suites

## 🐛 Troubleshooting

### Common Issues

1. **"Insufficient funds"**
   - Get testnet tokens from faucets
   - Check gas/fee settings

2. **"Transaction failed"**
   - Verify private keys and addresses
   - Check network connectivity
   - Ensure sufficient gas/fees

3. **"Contract not found"**
   - Verify contract addresses
   - Check network configuration
   - Ensure contracts are deployed

4. **"Contract sync issues"**
   - Check blockchain network status
   - Verify transaction confirmations
   - Monitor contract state

### Getting Help

- **Individual Blockchains**: See respective README files
- **General Issues**: Open GitHub issues

## 📚 Documentation

### Individual Blockchain READMEs

- [Ethereum Implementation](./Eth/README.md)
- [Aptos Implementation](./Aptos/README.md)
- [Sui Implementation](./sui/README.md)
- [NEAR Implementation](./Near/README.md)
- [Stellar Implementation](./stellar/README.md)
- [TRON Implementation](./Tron/README.md)
- [Monad Implementation](./Monad/README.md)

### Technical Resources

- **Atomic Swaps**: [HTLC Documentation](https://en.bitcoin.it/wiki/Atomic_swap)
- **Cross-Chain**: [Interoperability Standards](https://docs.cosmos.network/)
- **Security**: [Cryptographic Hashing](https://en.wikipedia.org/wiki/Cryptographic_hash_function)

## 🤝 Contributing

### Development Guidelines

1. **Fork the repository**
2. **Create feature branch**
3. **Implement changes**
4. **Add comprehensive tests**
5. **Update documentation**
6. **Submit pull request**

### Code Standards

- **Smart Contracts**: Follow blockchain-specific best practices
- **JavaScript**: Use ES6+ features and async/await
- **Testing**: Include unit and integration tests
- **Documentation**: Maintain comprehensive READMEs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**Important**: This is testnet software for educational and development purposes. Do not use with real funds on mainnet without proper auditing and security reviews.

## 🎉 Acknowledgments

- **Blockchain Communities**: For providing excellent developer tools and documentation
- **Open Source Contributors**: For building the foundation of cross-chain interoperability
- **Security Researchers**: For advancing blockchain security practices

---

**Happy Cross-Chain Swapping! 🚀**

*Built with ❤️ for the decentralized future* 
