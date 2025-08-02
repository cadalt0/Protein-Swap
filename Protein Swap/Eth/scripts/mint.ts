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

  // Get UNITE token address from environment variables
  const uniteTokenAddress = process.env.UNITE_TOKEN_ADDRESS;
  if (!uniteTokenAddress) {
    throw new Error("UNITE_TOKEN_ADDRESS environment variable is required. Please set it before running the script.");
  }

  console.log(`\n🪙 MINTING UNITE TOKENS ON BASE SEPOLIA`);
  console.log(`📡 Using RPC: ${rpcUrl}\n`);

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Target address to mint tokens to (caller's address)
  const targetAddress = wallet.address;

  console.log(`👤 Caller address: ${wallet.address}`);
  console.log(`💰 Caller balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} ETH`);
  console.log(`🎯 Minting to: ${targetAddress} (caller's address)`);
  console.log(`🪙 Token contract: ${uniteTokenAddress}\n`);

  try {
    // Get UNITE token contract
    const uniteAbi = [
      "function mint(address to, uint256 value) public returns (bool)",
      "function balanceOf(address account) external view returns (uint256)",
      "function name() external view returns (string)",
      "function symbol() external view returns (string)",
      "function decimals() external view returns (uint8)"
    ];
    
    const unite = new ethers.Contract(uniteTokenAddress, uniteAbi, wallet);

    // Get token info
    const tokenName = await unite.name();
    const tokenSymbol = await unite.symbol();
    const decimals = await unite.decimals();
    
    console.log(`📋 Token Information:`);
    console.log(`   Name: ${tokenName}`);
    console.log(`   Symbol: ${tokenSymbol}`);
    console.log(`   Decimals: ${decimals}\n`);

    // Check current balance before minting
    const balanceBefore = await unite.balanceOf(targetAddress);
    const formattedBalanceBefore = ethers.formatUnits(balanceBefore, decimals);
    console.log(`💰 Balance before minting: ${formattedBalanceBefore} ${tokenSymbol}`);

    // Mint 1000 tokens
    const mintAmount = ethers.parseUnits("1000", decimals);
    console.log(`\n🔨 Minting ${ethers.formatUnits(mintAmount, decimals)} ${tokenSymbol} tokens...`);
    
    const mintTx = await unite.mint(targetAddress, mintAmount);
    console.log(`📝 Transaction submitted: ${mintTx.hash}`);
    console.log(`🔗 Explorer: https://sepolia.basescan.org/tx/${mintTx.hash}`);
    
    // Wait for confirmation
    console.log(`⏳ Waiting for confirmation...`);
    const receipt = await mintTx.wait();
    
    if (receipt?.status !== 1) {
      throw new Error(`Transaction failed with status: ${receipt?.status}`);
    }

    // Wait for state to update
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check new balance
    const balanceAfter = await unite.balanceOf(targetAddress);
    const formattedBalanceAfter = ethers.formatUnits(balanceAfter, decimals);
    const mintedAmount = balanceAfter - balanceBefore;
    const formattedMintedAmount = ethers.formatUnits(mintedAmount, decimals);

    console.log(`\n✅ Minting completed successfully!`);
    console.log(`💰 Balance after minting: ${formattedBalanceAfter} ${tokenSymbol}`);
    console.log(`🎉 Minted amount: ${formattedMintedAmount} ${tokenSymbol}`);

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 MINTING SUMMARY");
    console.log("=".repeat(60));
    console.log(`🪙 Token: ${tokenName} (${tokenSymbol})`);
    console.log(`📍 Contract: ${uniteTokenAddress}`);
    console.log(`🎯 Recipient: ${targetAddress}`);
    console.log(`💎 Amount Minted: ${formattedMintedAmount} ${tokenSymbol}`);
    console.log(`💰 New Balance: ${formattedBalanceAfter} ${tokenSymbol}`);
    console.log(`🔗 Transaction: https://sepolia.basescan.org/tx/${mintTx.hash}`);
    console.log(`🌐 View on Explorer: https://sepolia.basescan.org/address/${targetAddress}`);

  } catch (error) {
    console.error("\n❌ Minting failed:");
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Script execution failed:");
  console.error(error);
  process.exitCode = 1;
});