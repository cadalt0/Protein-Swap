const { ethers } = require("ethers");
require('dotenv').config();

// --- CONFIGURATION FROM ENV ---
const RPC_URL = process.env.RPC_URL;
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS;
const ERC20_TOKEN_ADDRESS = process.env.ERC20_TOKEN_ADDRESS;

const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
const TAKER_PRIVATE_KEY = process.env.TAKER_PRIVATE_KEY;
const TAKER_ADDRESS = process.env.TAKER_ADDRESS;

const AMOUNT = ethers.parseUnits(process.env.TOKEN_AMOUNT || "10", 18);
const TIMELOCK_DURATION = parseInt(process.env.TIMELOCK_DURATION || "3600"); // 1 hour default

// Explorer URL (Monad testnet)
const EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";

// --- CONTRACT ABIS ---
const ESCROW_ABI = [
  "function createEscrow(bytes32 orderId, bytes32 hash, address taker, address tokenAddress, uint256 amount, uint64 timelockDuration) external payable",
  "function revealSecret(bytes32 orderId, address owner, bytes secret) external",
  "function getEscrow(bytes32 orderId, address owner) external view returns (tuple(bytes32,bytes32,address,address,address,uint256,uint64,uint8,uint64))"
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address owner) external view returns (uint256)"
];

// Generate random order ID and secret
function generateRandomOrderId() {
  return ethers.randomBytes(32);
}

function generateRandomSecret() {
  return ethers.randomBytes(32);
}

// Retry function for transactions
async function retryTransaction(transactionFunction, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transactionFunction();
    } catch (error) {
      console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        throw new Error(`Transaction failed after ${maxRetries} attempts. Last error: ${error.message}`);
      }
      
      console.log(`🔄 Retrying in 3 seconds... (${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

async function main() {
  // Validate required environment variables
  const requiredEnvVars = [
    'RPC_URL', 'ESCROW_CONTRACT_ADDRESS', 'ERC20_TOKEN_ADDRESS',
    'OWNER_PRIVATE_KEY', 'TAKER_PRIVATE_KEY', 'TAKER_ADDRESS'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Owner wallet (escrow creator)
  const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  // Taker wallet (escrow unlocker)
  const takerWallet = new ethers.Wallet(TAKER_PRIVATE_KEY, provider);

  const escrow = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, ownerWallet);
  const token = new ethers.Contract(ERC20_TOKEN_ADDRESS, ERC20_ABI, ownerWallet);

  // Generate random order ID and secret
  const ORDER_ID = generateRandomOrderId();
  const SECRET = generateRandomSecret();
  const HASH = ethers.keccak256(SECRET);

  console.log("=== Atomic Swap Escrow Demo ===");
  console.log(`Order ID: ${ORDER_ID}`);
  console.log(`Secret: ${SECRET}`);
  console.log(`Hash: ${HASH}`);
  console.log(`Amount: ${ethers.formatUnits(AMOUNT, 18)} tokens`);
  console.log(`Timelock Duration: ${TIMELOCK_DURATION} seconds`);
  console.log(`Owner: ${ownerWallet.address}`);
  console.log(`Taker: ${TAKER_ADDRESS}`);
  console.log("");

  // 1. Approve escrow contract to spend owner's tokens
  console.log("1. Approving escrow contract to spend tokens...");
  const approveTx = await retryTransaction(async () => {
    const tx = await token.approve(ESCROW_CONTRACT_ADDRESS, AMOUNT);
    await tx.wait();
    return tx;
  });
  console.log("✅ Approved.");
  console.log(`🔗 Explorer: ${EXPLORER_URL}${approveTx.hash}`);

  // 2. Create escrow
  console.log("2. Creating escrow...");
  const createTx = await retryTransaction(async () => {
    const tx = await escrow.createEscrow(
      ORDER_ID,
      HASH,
      TAKER_ADDRESS,
      ERC20_TOKEN_ADDRESS,
      AMOUNT,
      TIMELOCK_DURATION
    );
    await tx.wait();
    return tx;
  });
  console.log("✅ Escrow created.");
  console.log(`🔗 Explorer: ${EXPLORER_URL}${createTx.hash}`);

  // 3. Wait 5 seconds
  console.log("3. Waiting 5 seconds...");
  await new Promise(res => setTimeout(res, 5000));

  // 4. Unlock escrow with taker
  const escrowTaker = escrow.connect(takerWallet);
  console.log("4. Revealing secret as taker...");
  const revealTx = await retryTransaction(async () => {
    const tx = await escrowTaker.revealSecret(
      ORDER_ID,
      ownerWallet.address,
      SECRET
    );
    await tx.wait();
    return tx;
  });
  console.log("✅ Escrow unlocked with secret.");
  console.log(`🔗 Explorer: ${EXPLORER_URL}${revealTx.hash}`);
  console.log("");
  console.log("🎉 Atomic swap completed successfully!");
}

main().catch(console.error); 