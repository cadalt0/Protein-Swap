import { ethers } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  // Check if private key is provided
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required. Please set it before running the script.");
  }

  // Get RPC URL from environment variables
  const rpcUrl = process.env.RPC_URL ;

  console.log(`\n🚀 Deploying contracts to BASE SEPOLIA network`);
  console.log(`📡 Using RPC: ${rpcUrl}\n`);

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`👤 Deployer address: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} ETH`);
  
  // Get current nonce to avoid nonce conflicts
  const currentNonce = await provider.getTransactionCount(wallet.address, "pending");
  console.log(`🔢 Current nonce: ${currentNonce}\n`);

  const deployedContracts: { [key: string]: string } = {};
  let nonce = currentNonce;

  try {
    // Deploy UNITEV1Token
    console.log("📦 Deploying UNITEV1Token...");
    const UNITEV1Token = await ethers.getContractFactory("UNITEV1Token");
    const unite = await UNITEV1Token.connect(wallet).deploy({ nonce: nonce++ });
    await unite.waitForDeployment();
    const uniteAddress = await unite.getAddress();
    deployedContracts.UNITEV1Token = uniteAddress;
    console.log(`✅ UNITEV1Token deployed to: ${uniteAddress}`);

    // Deploy AtomicSwapEscrow
    console.log("\n📦 Deploying AtomicSwapEscrow...");
    const AtomicSwapEscrow = await ethers.getContractFactory("AtomicSwapEscrow");
    const escrow = await AtomicSwapEscrow.connect(wallet).deploy({ nonce: nonce++ });
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();
    deployedContracts.AtomicSwapEscrow = escrowAddress;
    console.log(`✅ AtomicSwapEscrow deployed to: ${escrowAddress}`);

    // Deploy AtomicSwapEscrowDest
    console.log("\n📦 Deploying AtomicSwapEscrowDest...");
    const AtomicSwapEscrowDest = await ethers.getContractFactory("AtomicSwapEscrowDest");
    const escrowDest = await AtomicSwapEscrowDest.connect(wallet).deploy({ nonce: nonce++ });
    await escrowDest.waitForDeployment();
    const escrowDestAddress = await escrowDest.getAddress();
    deployedContracts.AtomicSwapEscrowDest = escrowDestAddress;
    console.log(`✅ AtomicSwapEscrowDest deployed to: ${escrowDestAddress}`);

    // Print deployment summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log(`🌐 Network: BASE SEPOLIA`);
    console.log(`👤 Deployer: ${wallet.address}`);
    console.log("\n📋 Contract Addresses:");
    console.log("-".repeat(40));
    
    for (const [contractName, address] of Object.entries(deployedContracts)) {
      console.log(`${contractName}: ${address}`);
    }
    
    console.log("\n🔗 Explorer Links:");
    console.log("-".repeat(40));
    const explorerBase = "https://sepolia.basescan.org/address/";
    
    for (const [contractName, address] of Object.entries(deployedContracts)) {
      console.log(`${contractName}: ${explorerBase}${address}`);
    }

   

  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Script execution failed:");
  console.error(error);
  process.exitCode = 1;
}); 