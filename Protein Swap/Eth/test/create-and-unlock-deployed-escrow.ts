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

  // Check if taker private key is provided
  const takerPrivateKey = process.env.TAKER_PRIVATE_KEY;
  if (!takerPrivateKey) {
    throw new Error("TAKER_PRIVATE_KEY environment variable is required. Please set it before running the script.");
  }

  // Get RPC URL from environment variables
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error("RPC_URL environment variable is required. Please set it before running the script.");
  }

  console.log(`\n🔄 Creating and Unlocking Escrow on BASE SEPOLIA`);
  console.log(`📡 Using RPC: ${rpcUrl}\n`);

  // Create provider and wallets
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const ownerWallet = new ethers.Wallet(privateKey, provider);
  const takerWallet = new ethers.Wallet(takerPrivateKey, provider);

  console.log(`👤 Owner address: ${ownerWallet.address}`);
  console.log(`💰 Owner balance: ${ethers.formatEther(await provider.getBalance(ownerWallet.address))} ETH`);
  console.log(`👤 Taker address: ${takerWallet.address}`);
  console.log(`💰 Taker balance: ${ethers.formatEther(await provider.getBalance(takerWallet.address))} ETH\n`);

  // --- DEPLOYED CONTRACT ADDRESSES ---
  const UNITE_TOKEN_ADDRESS = process.env.UNITE_TOKEN_ADDRESS;
  if (!UNITE_TOKEN_ADDRESS) {
    throw new Error("UNITE_TOKEN_ADDRESS environment variable is required. Please set it before running the script.");
  }
  
  const ESCROW_ADDRESS = process.env.ESCROW_ADDRESS;
  if (!ESCROW_ADDRESS) {
    throw new Error("ESCROW_ADDRESS environment variable is required. Please set it before running the script.");
  }
  
  // --- ESCROW PARAMETERS ---
  const taker = process.env.TAKER_ADDRESS;
  if (!taker) {
    throw new Error("TAKER_ADDRESS environment variable is required. Please set it before running the script.");
  }

  // Verify that the taker private key matches the taker address
  if (takerWallet.address.toLowerCase() !== taker.toLowerCase()) {
    throw new Error(`TAKER_PRIVATE_KEY does not match TAKER_ADDRESS. Expected: ${taker}, Got: ${takerWallet.address}`);
  }
  const orderId = `order_${Date.now()}`; // Unique order ID
  const amount = ethers.parseUnits("100", 18); // 100 UNITE tokens
  const timelockDuration = 3600; // 1 hour

  console.log(`📋 Escrow Parameters:`);
  console.log(`   Order ID: ${orderId}`);
  console.log(`   Token: ${UNITE_TOKEN_ADDRESS}`);
  console.log(`   Escrow Contract: ${ESCROW_ADDRESS}`);
  console.log(`   Owner: ${ownerWallet.address}`);
  console.log(`   Taker: ${taker}`);
  console.log(`   Amount: ${ethers.formatUnits(amount, 18)} UNITE`);
  console.log(`   Timelock: ${timelockDuration} seconds (1 hour)\n`);

  try {
    // 1. Generate random secret and hash
    const secretString = `secret_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const secret = ethers.toUtf8Bytes(secretString);
    const hash = ethers.keccak256(secret);
    
    console.log(`🔐 Secret Generation:`);
    console.log(`   Secret: "${secretString}"`);
    console.log(`   Secret as bytes: ${ethers.hexlify(secret)}`);
    console.log(`   Hash: ${hash}\n`);

    // 2. Get UNITE token contract
    const uniteAbi = [
      "function approve(address spender, uint256 amount) public returns (bool)",
      "function balanceOf(address account) external view returns (uint256)",
      "function allowance(address owner, address spender) external view returns (uint256)"
    ];
    const unite = new ethers.Contract(UNITE_TOKEN_ADDRESS, uniteAbi, ownerWallet);

    // Check current balance
    const balance = await unite.balanceOf(ownerWallet.address);
    const formattedBalance = ethers.formatUnits(balance, 18);
    console.log(`💰 Current UNITE balance: ${formattedBalance} UNITE`);

    if (balance < amount) {
      throw new Error(`Insufficient UNITE balance. Need ${ethers.formatUnits(amount, 18)} but have ${formattedBalance}`);
    }

    // 3. Approve escrow contract to spend tokens
    console.log(`\n📝 Approving escrow contract to spend ${ethers.formatUnits(amount, 18)} UNITE...`);
    const approveTx = await unite.approve(ESCROW_ADDRESS, amount);
    const approveReceipt = await approveTx.wait();
    console.log(`✅ Approval successful!`);
    console.log(`🔗 Approval tx: https://sepolia.basescan.org/tx/${approveReceipt?.hash}`);

    // Check allowance
    const allowance = await unite.allowance(ownerWallet.address, ESCROW_ADDRESS);
    console.log(`✅ Allowance set: ${ethers.formatUnits(allowance, 18)} UNITE`);

    // 4. Create escrow
    console.log(`\n📦 Creating escrow...`);
    const escrowAbi = [
      "function createEscrow(string memory orderId, address owner, bytes32 hash, address taker, address token, uint256 amount, uint256 timelockDuration) external",
      "function revealSecret(string memory orderId, address owner, bytes memory secret) external",
      "function getEscrow(string memory orderId, address owner) external view returns (string memory, bytes32, address, address, address, uint256, uint256, uint8, uint256, uint256)",
      "function isEscrowActive(string memory orderId, address owner) external view returns (bool)"
    ];
    
    const escrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, ownerWallet);
    
    const createTx = await escrow.createEscrow(
      orderId,
      ownerWallet.address,
      hash,
      taker,
      UNITE_TOKEN_ADDRESS,
      amount,
      timelockDuration
    );
    const createReceipt = await createTx.wait();
    console.log(`✅ Escrow created successfully!`);
    console.log(`🔗 Create tx: https://sepolia.basescan.org/tx/${createReceipt?.hash}`);

    // 5. Verify escrow exists and is active
    const isActive = await escrow.isEscrowActive(orderId, ownerWallet.address);
    console.log(`✅ Escrow is active: ${isActive}`);

    // Get escrow details
    const escrowDetails = await escrow.getEscrow(orderId, ownerWallet.address);
    console.log(`📋 Escrow details:`);
    console.log(`   Order ID: ${escrowDetails[0]}`);
    console.log(`   Hash: ${escrowDetails[1]}`);
    console.log(`   Owner: ${escrowDetails[2]}`);
    console.log(`   Taker: ${escrowDetails[3]}`);
    console.log(`   Token: ${escrowDetails[4]}`);
    console.log(`   Amount: ${ethers.formatUnits(escrowDetails[5], 18)} UNITE`);
    console.log(`   Status: ${escrowDetails[7]} (1=Active, 2=Completed, 3=Cancelled)`);

    // 6. Wait a moment before unlocking
    console.log(`\n⏳ Waiting 5 seconds before unlocking...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 7. Reveal secret to unlock escrow (using taker's wallet)
    console.log(`\n🔓 Revealing secret to unlock escrow using taker's wallet...`);
    const escrowForTaker = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, takerWallet);
    const revealTx = await escrowForTaker.revealSecret(orderId, ownerWallet.address, secret);
    const revealReceipt = await revealTx.wait();
    console.log(`✅ Escrow unlocked successfully by taker!`);
    console.log(`🔗 Unlock tx: https://sepolia.basescan.org/tx/${revealReceipt?.hash}`);

    // 8. Verify escrow completion
    const isStillActive = await escrow.isEscrowActive(orderId, ownerWallet.address);
    console.log(`✅ Escrow is now inactive: ${!isStillActive}`);

    // Check final balances
    const finalOwnerBalance = await unite.balanceOf(ownerWallet.address);
    const finalOwnerFormattedBalance = ethers.formatUnits(finalOwnerBalance, 18);
    console.log(`💰 Final Owner UNITE balance: ${finalOwnerFormattedBalance} UNITE`);
    
    const finalTakerBalance = await unite.balanceOf(takerWallet.address);
    const finalTakerFormattedBalance = ethers.formatUnits(finalTakerBalance, 18);
    console.log(`💰 Final Taker UNITE balance: ${finalTakerFormattedBalance} UNITE`);

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 ESCROW CYCLE COMPLETE!");
    console.log("=".repeat(60));
    console.log(`📋 Summary:`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Amount: ${ethers.formatUnits(amount, 18)} UNITE`);
    console.log(`   Owner: ${ownerWallet.address}`);
    console.log(`   Taker: ${takerWallet.address}`);
    console.log(`   Secret: "${secretString}"`);
    console.log(`   Status: Completed ✅ (Unlocked by Taker)`);
    console.log(`\n🔗 Transaction Links:`);
    console.log(`   Approval: https://sepolia.basescan.org/tx/${approveReceipt?.hash}`);
    console.log(`   Create Escrow: https://sepolia.basescan.org/tx/${createReceipt?.hash}`);
    console.log(`   Unlock Escrow: https://sepolia.basescan.org/tx/${revealReceipt?.hash}`);

  } catch (error) {
    console.error("\n❌ Escrow operation failed:");
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Script execution failed:");
  console.error(error);
  process.exitCode = 1;
});