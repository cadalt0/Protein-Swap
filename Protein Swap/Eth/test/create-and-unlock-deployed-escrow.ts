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

  console.log(`\n🔄 Creating and Unlocking Escrow on BASE SEPOLIA`);
  console.log(`📡 Using RPC: ${rpcUrl}\n`);

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`👤 User address: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} ETH\n`);

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
  const orderId = `order_${Date.now()}`; // Unique order ID
  const amount = ethers.parseUnits("100", 18); // 100 UNITE tokens
  const timelockDuration = 3600; // 1 hour

  console.log(`📋 Escrow Parameters:`);
  console.log(`   Order ID: ${orderId}`);
  console.log(`   Token: ${UNITE_TOKEN_ADDRESS}`);
  console.log(`   Escrow Contract: ${ESCROW_ADDRESS}`);
  console.log(`   Owner: ${wallet.address}`);
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
    const unite = new ethers.Contract(UNITE_TOKEN_ADDRESS, uniteAbi, wallet);

    // Check current balance
    const balance = await unite.balanceOf(wallet.address);
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
    const allowance = await unite.allowance(wallet.address, ESCROW_ADDRESS);
    console.log(`✅ Allowance set: ${ethers.formatUnits(allowance, 18)} UNITE`);

    // 4. Create escrow
    console.log(`\n📦 Creating escrow...`);
    const escrowAbi = [
      "function createEscrow(string memory orderId, address owner, bytes32 hash, address taker, address token, uint256 amount, uint256 timelockDuration) external",
      "function revealSecret(string memory orderId, address owner, bytes memory secret) external",
      "function getEscrow(string memory orderId, address owner) external view returns (string memory, bytes32, address, address, address, uint256, uint256, uint8, uint256, uint256)",
      "function isEscrowActive(string memory orderId, address owner) external view returns (bool)"
    ];
    
    const escrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, wallet);
    
    const createTx = await escrow.createEscrow(
      orderId,
      wallet.address,
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
    const isActive = await escrow.isEscrowActive(orderId, wallet.address);
    console.log(`✅ Escrow is active: ${isActive}`);

    // Get escrow details
    const escrowDetails = await escrow.getEscrow(orderId, wallet.address);
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

    // 7. Reveal secret to unlock escrow
    console.log(`\n🔓 Revealing secret to unlock escrow...`);
    const revealTx = await escrow.revealSecret(orderId, wallet.address, secret);
    const revealReceipt = await revealTx.wait();
    console.log(`✅ Escrow unlocked successfully!`);
    console.log(`🔗 Unlock tx: https://sepolia.basescan.org/tx/${revealReceipt?.hash}`);

    // 8. Verify escrow completion
    const isStillActive = await escrow.isEscrowActive(orderId, wallet.address);
    console.log(`✅ Escrow is now inactive: ${!isStillActive}`);

    // Check final balance
    const finalBalance = await unite.balanceOf(wallet.address);
    const finalFormattedBalance = ethers.formatUnits(finalBalance, 18);
    console.log(`💰 Final UNITE balance: ${finalFormattedBalance} UNITE`);

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 ESCROW CYCLE COMPLETE!");
    console.log("=".repeat(60));
    console.log(`📋 Summary:`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Amount: ${ethers.formatUnits(amount, 18)} UNITE`);
    console.log(`   Secret: "${secretString}"`);
    console.log(`   Status: Completed ✅`);
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