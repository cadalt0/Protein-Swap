const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config();

// Load configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;
const RPC_URL = process.env.RPC_URL || "https://aptos-testnet.public.blastapi.io";

// Token configuration (based on MockToken contract)
const TOKEN_DECIMALS = 8; // From Bmock_token.move line 15
const TOKEN_AMOUNT_HUMAN = 1000; // 1000 tokens
const TOKEN_AMOUNT_RAW = (TOKEN_AMOUNT_HUMAN * Math.pow(10, TOKEN_DECIMALS)).toString(); // 1000 * 10^8

// Validate required environment variables
function validateEnvironment() {
    const missingVars = [];
    
    if (!PRIVATE_KEY) missingVars.push('PRIVATE_KEY');
    if (!ACCOUNT_ADDRESS) missingVars.push('ACCOUNT_ADDRESS');
    
    if (missingVars.length > 0) {
        console.error("❌ Missing required environment variables:");
        missingVars.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error("\n💡 Please create a .env file with the following variables:");
        console.error("   PRIVATE_KEY=0xyour_private_key_here");
        console.error("   ACCOUNT_ADDRESS=0xyour_account_address_here");
        console.error("   RPC_URL=https://aptos-testnet.public.blastapi.io (optional)");
        process.exit(1);
    }
}

// Validate that environment values are not placeholder values
function validateValues() {
    const placeholders = ['0xyour_private_key_here', '0xyour_address', 'your_private_key', 'your_address'];
    
    if (placeholders.some(placeholder => PRIVATE_KEY?.includes(placeholder))) {
        console.error("❌ PRIVATE_KEY appears to contain placeholder value");
        console.error("Please update your .env file with a real private key");
        process.exit(1);
    }
    
    if (placeholders.some(placeholder => ACCOUNT_ADDRESS?.includes(placeholder))) {
        console.error("❌ ACCOUNT_ADDRESS appears to contain placeholder value");
        console.error("Please update your .env file with a real account address");
        process.exit(1);
    }
    
    // Basic format validation
    if (!PRIVATE_KEY.startsWith('0x') || PRIVATE_KEY.length < 64) {
        console.error("❌ PRIVATE_KEY format appears invalid (should start with 0x and be 64+ chars)");
        process.exit(1);
    }
    
    if (!ACCOUNT_ADDRESS.startsWith('0x') || ACCOUNT_ADDRESS.length < 42) {
        console.error("❌ ACCOUNT_ADDRESS format appears invalid (should start with 0x and be 42+ chars)");
        process.exit(1);
    }
}

function displayConfiguration() {
    console.log("🪙 Minting MockToken using Environment Configuration...");
    console.log("=" .repeat(60));
    console.log("📋 Configuration:");
    console.log("Account Address:", ACCOUNT_ADDRESS);
    console.log("RPC URL:", RPC_URL);
    console.log("Private Key:", PRIVATE_KEY ? `${PRIVATE_KEY.substring(0, 8)}...` : "Not provided");
    console.log("Token Amount (Human):", TOKEN_AMOUNT_HUMAN, "tokens");
    console.log("Token Amount (Raw):", TOKEN_AMOUNT_RAW, `(with ${TOKEN_DECIMALS} decimals)`);
    console.log("=" .repeat(60));
}

function mintTokens() {
    try {
        // Validate environment first
        validateEnvironment();
        validateValues();
        
        // Display configuration
        displayConfiguration();
        
        console.log("\n🔄 Minting MockTokens using Aptos CLI...");
        
        // Construct the mint command
        const functionId = `${ACCOUNT_ADDRESS}::A3mock_token::mint`;
        const mintCommand = `aptos move run --function-id ${functionId} --args u64:${TOKEN_AMOUNT_RAW} --private-key ${PRIVATE_KEY} --url ${RPC_URL} --assume-yes`;
        
        console.log("💼 Running mint command...");
        console.log(`Command: aptos move run --function-id ${functionId} --args u64:${TOKEN_AMOUNT_RAW} --private-key ${PRIVATE_KEY.substring(0, 8)}... --url ${RPC_URL} --assume-yes`);
        
        console.log("\n⏳ Executing transaction...");
        
        // Execute mint command with real-time output
        // Clear node_modules from PATH to force system CLI usage
        const cleanEnv = { ...process.env };
        const currentPath = cleanEnv.PATH || cleanEnv.Path || '';
        cleanEnv.PATH = currentPath.split(path.delimiter)
            .filter(p => !p.includes('node_modules'))
            .join(path.delimiter);
            
        execSync(mintCommand, { 
            stdio: 'inherit',
            env: cleanEnv
        });
        
        // Success message
        console.log("\n🎉 Token minting completed successfully!");
        console.log("=" .repeat(60));
        console.log("✅ MockTokens minted successfully!");
        console.log("🏠 Account address:", ACCOUNT_ADDRESS);
        console.log("💰 Amount minted:", TOKEN_AMOUNT_HUMAN, "tokens");
        console.log("🔢 Raw amount:", TOKEN_AMOUNT_RAW, `(${TOKEN_DECIMALS} decimals)`);
        console.log("🪙 Token type: A3mock_token::MockToken");
        console.log("\n🚀 You can now use these tokens for atomic swaps!");
        console.log(`🔗 Explorer: https://explorer.aptoslabs.com/account/${ACCOUNT_ADDRESS}?network=testnet`);
        console.log("=" .repeat(60));
        
        // Display next steps
        console.log("\n📝 Next Steps:");
        console.log("1. Check your token balance:");
        console.log(`   aptos account balance --account ${ACCOUNT_ADDRESS} --url ${RPC_URL}`);
        console.log("2. Run escrow tests:");
        console.log(`   node test-escrow-generic.js`);
        console.log("3. View your account on explorer:");
        console.log(`   https://explorer.aptoslabs.com/account/${ACCOUNT_ADDRESS}?network=testnet`);
        
    } catch (error) {
        console.error("\n❌ Token minting failed!");
        console.error("Error details:", error.message);
        
        // Provide helpful debugging information
        console.error("\n🔍 Debugging tips:");
        console.error("1. Ensure the MockToken contract is deployed to your account");
        console.error("2. Check your private key and account address are correct");
        console.error("3. Verify your account has sufficient APT for gas fees");
        console.error("4. Make sure the RPC URL is accessible");
        console.error("5. Confirm the contract address matches your deployment");
        
        process.exit(1);
    }
}

// Additional helper function to check token balance
function checkTokenBalance() {
    try {
        console.log("\n💰 Checking current token balance...");
        const balanceCommand = `aptos account balance --account ${ACCOUNT_ADDRESS} --url ${RPC_URL}`;
        
        // Clear node_modules from PATH to force system CLI usage
        const cleanEnv = { ...process.env };
        const currentPath = cleanEnv.PATH || cleanEnv.Path || '';
        cleanEnv.PATH = currentPath.split(path.delimiter)
            .filter(p => !p.includes('node_modules'))
            .join(path.delimiter);
            
        execSync(balanceCommand, { 
            stdio: 'inherit',
            env: cleanEnv
        });
    } catch (error) {
        console.log("⚠️  Could not check token balance, but continuing with minting...");
    }
}

// Main execution
console.log("🏗️  MockToken Minting Script");
console.log("📅 " + new Date().toLocaleString());

// Optional: Check balance before minting
if (process.argv.includes('--check-balance')) {
    validateEnvironment();
    validateValues();
    checkTokenBalance();
    process.exit(0);
}

// Run minting
mintTokens();