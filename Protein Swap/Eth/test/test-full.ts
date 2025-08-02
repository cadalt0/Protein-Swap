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
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error("RPC_URL environment variable is required. Please set it before running the script.");
  }

  console.log(`\n🚀 FULL DEPLOYMENT & ESCROW CYCLE ON BASE SEPOLIA`);
  console.log(`📡 Using RPC: ${rpcUrl}\n`);

  // Create provider and wallet (deployer)
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployerWallet = new ethers.Wallet(privateKey, provider);

  // Create a new wallet for taker
  const takerWallet = ethers.Wallet.createRandom().connect(provider);

  console.log(`👤 Deployer address: ${deployerWallet.address}`);
  console.log(`💰 Deployer balance: ${ethers.formatEther(await provider.getBalance(deployerWallet.address))} ETH`);
  console.log(`\n🎯 New Taker Wallet Created:`);
  console.log(`   Public Address: ${takerWallet.address}`);
  console.log(`   Private Key: ${takerWallet.privateKey}`);
  console.log(`   💰 Taker balance: ${ethers.formatEther(await provider.getBalance(takerWallet.address))} ETH\n`);

  // Get current nonce to avoid nonce conflicts
  const currentNonce = await provider.getTransactionCount(deployerWallet.address, "pending");
  console.log(`🔢 Current nonce: ${currentNonce}\n`);

  const deployedContracts: { [key: string]: string } = {};
  let nonce = currentNonce;

  try {
    // === DEPLOYMENT PHASE ===
    console.log("=" .repeat(60));
    console.log("📦 DEPLOYMENT PHASE");
    console.log("=".repeat(60));

    // Deploy UNITEV1Token
    console.log("📦 Deploying UNITEV1Token...");
    const UNITEV1Token = await ethers.getContractFactory("UNITEV1Token");
    const unite = await UNITEV1Token.connect(deployerWallet).deploy({ nonce: nonce++ });
    await unite.waitForDeployment();
    await new Promise(resolve => setTimeout(resolve, 3000)); // Silent wait
    const uniteAddress = await unite.getAddress();
    deployedContracts.UNITEV1Token = uniteAddress;
    console.log(`✅ UNITEV1Token deployed to: ${uniteAddress}`);

    // Deploy AtomicSwapEscrow
    console.log("\n📦 Deploying AtomicSwapEscrow...");
    const AtomicSwapEscrow = await ethers.getContractFactory("AtomicSwapEscrow");
    const escrow = await AtomicSwapEscrow.connect(deployerWallet).deploy({ nonce: nonce++ });
    await escrow.waitForDeployment();
    await new Promise(resolve => setTimeout(resolve, 3000)); // Silent wait
    const escrowAddress = await escrow.getAddress();
    deployedContracts.AtomicSwapEscrow = escrowAddress;
    console.log(`✅ AtomicSwapEscrow deployed to: ${escrowAddress}`);

    // Deploy AtomicSwapEscrowDest
    console.log("\n📦 Deploying AtomicSwapEscrowDest...");
    const AtomicSwapEscrowDest = await ethers.getContractFactory("AtomicSwapEscrowDest");
    const escrowDest = await AtomicSwapEscrowDest.connect(deployerWallet).deploy({ nonce: nonce++ });
    await escrowDest.waitForDeployment();
    await new Promise(resolve => setTimeout(resolve, 3000)); // Silent wait
    const escrowDestAddress = await escrowDest.getAddress();
    deployedContracts.AtomicSwapEscrowDest = escrowDestAddress;
    console.log(`✅ AtomicSwapEscrowDest deployed to: ${escrowDestAddress}`);

    // === MINTING PHASE ===
    console.log("\n" + "=".repeat(60));
    console.log("🪙 MINTING PHASE");
    console.log("=".repeat(60));

    // Mint 1000 UNITE tokens to deployer
    console.log("🪙 Minting 1000 UNITE tokens to deployer...");
    const mintAmount = ethers.parseUnits("1000", 18); // 1000 tokens with 18 decimals
    const mintTx = await unite.connect(deployerWallet).mint(deployerWallet.address, mintAmount, { nonce: nonce++ });
    const mintReceipt = await mintTx.wait();
    await new Promise(resolve => setTimeout(resolve, 3000)); // Silent wait
    const mintTxHash = mintReceipt?.hash;
    console.log(`✅ Minted 1000 UNITE tokens to: ${deployerWallet.address}`);
    console.log(`🔗 Mint transaction: ${mintTxHash}`);

    // Check balance
    const balance = await unite.balanceOf(deployerWallet.address);
    const formattedBalance = ethers.formatUnits(balance, 18);
    console.log(`💰 UNITE balance: ${formattedBalance} UNITE`);

    // === ESCROW PHASE ===
    console.log("\n" + "=".repeat(60));
    console.log("🔄 ESCROW CREATION & UNLOCK PHASE");
    console.log("=".repeat(60));

    // Escrow parameters
    const orderId = `order_${Date.now()}`;
    const escrowAmount = ethers.parseUnits("100", 18); // 100 UNITE tokens
    const timelockDuration = 3600; // 1 hour

    console.log(`📋 Escrow Parameters:`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Owner: ${deployerWallet.address}`);
    console.log(`   Taker: ${takerWallet.address}`);
    console.log(`   Amount: ${ethers.formatUnits(escrowAmount, 18)} UNITE`);
    console.log(`   Timelock: ${timelockDuration} seconds (1 hour)\n`);

    // Generate random secret and hash
    const secretString = `secret_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const secret = ethers.toUtf8Bytes(secretString);
    const hash = ethers.keccak256(secret);
    
    console.log(`🔐 Secret Generation:`);
    console.log(`   Secret: "${secretString}"`);
    console.log(`   Secret as bytes: ${ethers.hexlify(secret)}`);
    console.log(`   Hash: ${hash}\n`);

    // Approve escrow contract to spend tokens
    console.log(`📝 Approving escrow contract to spend ${ethers.formatUnits(escrowAmount, 18)} UNITE...`);
    console.log(`🔍 Approving: ${deployerWallet.address} -> ${escrowAddress} for ${ethers.formatUnits(escrowAmount, 18)} UNITE`);
    
    const approveTx = await unite.connect(deployerWallet).approve(escrowAddress, escrowAmount, { nonce: nonce++ });
    const approveReceipt = await approveTx.wait();
    await new Promise(resolve => setTimeout(resolve, 3000)); // Silent wait
    
    // Check if transaction was successful
    if (approveReceipt?.status !== 1) {
      throw new Error(`Approval transaction failed with status: ${approveReceipt?.status}`);
    }
    
    console.log(`✅ Approval transaction confirmed!`);
    console.log(`🔗 Approval tx: https://sepolia.basescan.org/tx/${approveReceipt?.hash}`);

    // Verify allowance
    const allowance = await unite.allowance(deployerWallet.address, escrowAddress);
    console.log(`✅ Allowance verified: ${ethers.formatUnits(allowance, 18)} UNITE`);
    console.log(`📊 Required amount: ${ethers.formatUnits(escrowAmount, 18)} UNITE`);
    console.log(`🔍 Allowance sufficient: ${allowance >= escrowAmount}`);

    // Verify balance
    const currentBalance = await unite.balanceOf(deployerWallet.address);
    console.log(`💰 Current balance: ${ethers.formatUnits(currentBalance, 18)} UNITE`);
    console.log(`🔍 Balance sufficient: ${currentBalance >= escrowAmount}`);

    if (allowance < escrowAmount) {
      console.log(`⚠️ Allowance still insufficient, trying approval again...`);
      
      // Try approving again with a higher gas limit
      const retryApproveTx = await unite.connect(deployerWallet).approve(escrowAddress, escrowAmount, { 
        nonce: nonce++,
        gasLimit: 100000
      });
      const retryApproveReceipt = await retryApproveTx.wait();
      await new Promise(resolve => setTimeout(resolve, 3000)); // Silent wait
      console.log(`🔄 Retry approval tx: https://sepolia.basescan.org/tx/${retryApproveReceipt?.hash}`);
      const newAllowance = await unite.allowance(deployerWallet.address, escrowAddress);
      console.log(`🔍 New allowance: ${ethers.formatUnits(newAllowance, 18)} UNITE`);
      
      if (newAllowance < escrowAmount) {
        throw new Error(`Allowance still insufficient after retry: need ${ethers.formatUnits(escrowAmount, 18)} but have ${ethers.formatUnits(newAllowance, 18)}`);
      }
    }

    if (currentBalance < escrowAmount) {
      throw new Error(`Insufficient balance: need ${ethers.formatUnits(escrowAmount, 18)} but have ${ethers.formatUnits(currentBalance, 18)}`);
    }

    // Create escrow
    console.log(`\n📦 Creating escrow...`);
    const createTx = await escrow.connect(deployerWallet).createEscrow(
      orderId,
      deployerWallet.address,
      hash,
      takerWallet.address,
      uniteAddress,
      escrowAmount,
      timelockDuration,
      { nonce: nonce++ }
    );
    const createReceipt = await createTx.wait();
    await new Promise(resolve => setTimeout(resolve, 3000)); // Silent wait
    console.log(`✅ Escrow created successfully!`);
    console.log(`🔗 Create tx: https://sepolia.basescan.org/tx/${createReceipt?.hash}`);

    // Verify escrow exists and is active
    const isActive = await escrow.isEscrowActive(orderId, deployerWallet.address);
    console.log(`✅ Escrow is active: ${isActive}`);

    // Get escrow details
    const escrowDetails = await escrow.getEscrow(orderId, deployerWallet.address);
    console.log(`📋 Escrow details:`);
    console.log(`   Order ID: ${escrowDetails[0]}`);
    console.log(`   Hash: ${escrowDetails[1]}`);
    console.log(`   Owner: ${escrowDetails[2]}`);
    console.log(`   Taker: ${escrowDetails[3]}`);
    console.log(`   Token: ${escrowDetails[4]}`);
    console.log(`   Amount: ${ethers.formatUnits(escrowDetails[5], 18)} UNITE`);
    console.log(`   Status: ${escrowDetails[7]} (1=Active, 2=Completed, 3=Cancelled)`);

    // Wait before unlocking
    console.log(`\n⏳ Waiting 5 seconds before unlocking...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Reveal secret to unlock escrow (using deployer as contract owner)
    console.log(`\n🔓 Revealing secret to unlock escrow (as deployer/contract owner)...`);
    const revealTx = await escrow.connect(deployerWallet).revealSecret(orderId, deployerWallet.address, secret, { nonce: nonce++ });
    const revealReceipt = await revealTx.wait();
    await new Promise(resolve => setTimeout(resolve, 3000)); // Silent wait
    console.log(`✅ Escrow unlocked successfully by deployer (contract owner)!`);
    console.log(`🔗 Unlock tx: https://sepolia.basescan.org/tx/${revealReceipt?.hash}`);

    // Verify escrow completion
    const isStillActive = await escrow.isEscrowActive(orderId, deployerWallet.address);
    console.log(`✅ Escrow is now inactive: ${!isStillActive}`);

    // Check final balances
    const finalDeployerBalance = await unite.balanceOf(deployerWallet.address);
    const finalTakerBalance = await unite.balanceOf(takerWallet.address);
    console.log(`💰 Final deployer UNITE balance: ${ethers.formatUnits(finalDeployerBalance, 18)} UNITE`);
    console.log(`💰 Final taker UNITE balance: ${ethers.formatUnits(finalTakerBalance, 18)} UNITE`);

    // === SUMMARY ===
    console.log("\n" + "=".repeat(60));
    console.log("🎉 FULL CYCLE COMPLETE!");
    console.log("=".repeat(60));
    
    console.log(`📋 Deployed Contracts:`);
    for (const [contractName, address] of Object.entries(deployedContracts)) {
      console.log(`   ${contractName}: ${address}`);
    }

    console.log(`\n🎯 Wallets:`);
    console.log(`   Deployer: ${deployerWallet.address}`);
    console.log(`   Taker: ${takerWallet.address}`);
    console.log(`   Taker Private Key: ${takerWallet.privateKey}`);

    console.log(`\n🔄 Escrow Summary:`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Amount: ${ethers.formatUnits(escrowAmount, 18)} UNITE`);
    console.log(`   Secret: "${secretString}"`);
    console.log(`   Status: Completed ✅`);
    
    console.log(`\n🔗 Explorer Links:`);
    console.log(`   UNITE Token: https://sepolia.basescan.org/address/${uniteAddress}`);
    console.log(`   Escrow Contract: https://sepolia.basescan.org/address/${escrowAddress}`);
    console.log(`   Mint Tx: https://sepolia.basescan.org/tx/${mintTxHash}`);
    console.log(`   Approval Tx: https://sepolia.basescan.org/tx/${approveReceipt?.hash}`);
    console.log(`   Create Escrow Tx: https://sepolia.basescan.org/tx/${createReceipt?.hash}`);
    console.log(`   Unlock Escrow Tx: https://sepolia.basescan.org/tx/${revealReceipt?.hash}`);

    console.log(`\n💡 Transaction Summary:`);
    console.log(`   📦 Deployed 3 contracts`);
    console.log(`   🪙 Minted 1000 UNITE tokens`);
    console.log(`   🔄 Created and unlocked 1 escrow`);
    console.log(`   ⛽ Used ${nonce - currentNonce} transactions total`);

  } catch (error) {
    console.error("\n❌ Full cycle failed:");
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Script execution failed:");
  console.error(error);
  process.exitCode = 1;
});