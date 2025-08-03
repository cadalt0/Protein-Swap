const { ethers } = require("ethers");
require('dotenv').config();

// --- CONFIGURATION FROM ENV ---
const RPC_URL = process.env.RPC_URL;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const MINT_AMOUNT = ethers.parseUnits(process.env.MINT_AMOUNT || "1000", 18);

// Explorer URL (Monad testnet)
const EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";

// --- CONTRACT ABIS ---
const TOKEN_ABI = [
  "function mint(address to, uint256 value) external returns (bool)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
];

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
  const requiredEnvVars = ['RPC_URL', 'TOKEN_ADDRESS', 'PRIVATE_KEY'];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // Create wallet from private key
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet);

  console.log("=== Token Minting Script ===");
  console.log(`Token Address: ${TOKEN_ADDRESS}`);
  console.log(`Wallet Address: ${wallet.address}`);
  console.log(`Mint Amount: ${ethers.formatUnits(MINT_AMOUNT, 18)} tokens`);
  console.log("");

  // Get token info
  try {
    const [name, symbol, decimals] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals()
    ]);
    console.log(`Token: ${name} (${symbol})`);
    console.log(`Decimals: ${decimals}`);
    console.log("");
  } catch (error) {
    console.log("⚠️  Could not fetch token info (mint function may not be available)");
    console.log("");
  }

  // Check current balance
  try {
    const currentBalance = await token.balanceOf(wallet.address);
    console.log(`Current Balance: ${ethers.formatUnits(currentBalance, 18)} tokens`);
    console.log("");
  } catch (error) {
    console.log("⚠️  Could not fetch current balance");
    console.log("");
  }

  // Mint tokens
  console.log("Minting tokens...");
  const mintTx = await retryTransaction(async () => {
    const tx = await token.mint(wallet.address, MINT_AMOUNT);
    await tx.wait();
    return tx;
  });
  
  console.log("✅ Tokens minted successfully!");
  console.log(`🔗 Explorer: ${EXPLORER_URL}${mintTx.hash}`);

  // Check new balance
  try {
    const newBalance = await token.balanceOf(wallet.address);
    console.log(`New Balance: ${ethers.formatUnits(newBalance, 18)} tokens`);
  } catch (error) {
    console.log("⚠️  Could not fetch new balance");
  }

  console.log("");
  console.log("🎉 Minting completed successfully!");
}

main().catch(console.error); 