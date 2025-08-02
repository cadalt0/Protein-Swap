const { execSync } = require('child_process');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

// Load configuration from environment variables
const ESCROW_CREATOR_PRIVATE_KEY = process.env.PRIVATE_KEY;
const ESCROW_CREATOR_ADDRESS = process.env.ACCOUNT_ADDRESS;
const TAKER_PRIVATE_KEY = process.env.TAKER_PRIVATE_KEY;
const TAKER_ADDRESS = process.env.TAKER_ADDRESS;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || process.env.ACCOUNT_ADDRESS;
const RPC_URL = process.env.RPC_URL || "https://aptos-testnet.public.blastapi.io";

// Generate unique order ID and secret based on timestamp and salt
const timestamp = Date.now();
const salt = crypto.randomBytes(4).toString('hex');
const ORDER_ID = `escrow_${timestamp}_${salt}`;
const SECRET = crypto.randomBytes(16).toString('hex'); // Random 32-char hex string

// Escrow parameters
const TOKEN_ADDRESS = CONTRACT_ADDRESS; // MockToken is deployed here
const AMOUNT = "10000000000"; // 100 tokens with 8 decimals
const TIMELOCK = "120"; // 2 minutes in seconds

// Validate required environment variables
function validateEnvironment() {
    const missingVars = [];
    
    if (!ESCROW_CREATOR_PRIVATE_KEY) missingVars.push('PRIVATE_KEY');
    if (!ESCROW_CREATOR_ADDRESS) missingVars.push('ACCOUNT_ADDRESS');
    if (!TAKER_PRIVATE_KEY) missingVars.push('TAKER_PRIVATE_KEY');
    if (!TAKER_ADDRESS) missingVars.push('TAKER_ADDRESS');
    
    if (missingVars.length > 0) {
        console.error("❌ Missing required environment variables:");
        missingVars.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error("\n💡 Please create a .env file with the following variables:");
        console.error("   PRIVATE_KEY=0xyour_private_key_here");
        console.error("   ACCOUNT_ADDRESS=0xyour_account_address_here");
        console.error("   TAKER_PRIVATE_KEY=0xtaker_private_key_here");
        console.error("   TAKER_ADDRESS=0xtaker_address_here");
        console.error("   CONTRACT_ADDRESS=0xcontract_address_here (optional, defaults to ACCOUNT_ADDRESS)");
        console.error("   RPC_URL=https://aptos-testnet.public.blastapi.io (optional)");
        process.exit(1);
    }
    
    // Validate that values are not placeholders
    const placeholders = ['0xyour_private_key_here', '0xyour_address', 'your_private_key', 'your_address'];
    
    if (placeholders.some(placeholder => ESCROW_CREATOR_PRIVATE_KEY?.includes(placeholder))) {
        console.error("❌ PRIVATE_KEY appears to contain placeholder value");
        process.exit(1);
    }
    
    if (placeholders.some(placeholder => TAKER_PRIVATE_KEY?.includes(placeholder))) {
        console.error("❌ TAKER_PRIVATE_KEY appears to contain placeholder value");
        process.exit(1);
    }
}

function displayConfiguration() {
    console.log("🔒 Creating Escrow Test with Environment Configuration");
    console.log("=" .repeat(70));
    console.log("📋 Test Configuration:");
    console.log("Order ID:", ORDER_ID, "(auto-generated)");
    console.log("Secret:", SECRET, "(auto-generated)");
    console.log("Escrow Creator:", ESCROW_CREATOR_ADDRESS);
    console.log("Taker:", TAKER_ADDRESS);
    console.log("Contract Address:", CONTRACT_ADDRESS);
    console.log("Token Address:", TOKEN_ADDRESS);
    console.log("Amount:", AMOUNT, "(1000 tokens with 8 decimals)");
    console.log("Timelock (seconds):", TIMELOCK);
    console.log("RPC URL:", RPC_URL);
    console.log("=" .repeat(70));
}

// Hash the secret using SHA3-256
const hash = crypto.createHash('sha3-256').update(Buffer.from(SECRET)).digest('hex');

function createEscrowCommand() {
    // Clean environment to use system CLI
    const cleanEnv = { ...process.env };
    const currentPath = cleanEnv.PATH || cleanEnv.Path || '';
    cleanEnv.PATH = currentPath.split(path.delimiter)
        .filter(p => !p.includes('node_modules'))
        .join(path.delimiter);
    
    return { cleanEnv };
}

async function escrowCreatorCreateEscrow(retryCount = 0, maxRetries = 3) {
    try {
        const { cleanEnv } = createEscrowCommand();
        
        // Use the generic contract with MockToken type parameter
        const functionId = `${CONTRACT_ADDRESS}::fusion_swap_v3_coin::create_escrow`;
        const typeArgs = `${CONTRACT_ADDRESS}::A3mock_token::MockToken`;
        const args = [
            `string:${ORDER_ID}`,
            `hex:${hash}`,
            `address:${TAKER_ADDRESS}`,
            `address:${TOKEN_ADDRESS}`,
            `u64:${AMOUNT}`,
            `u64:${TIMELOCK}`
        ];
        const argsStr = args.join(' ');
        const cmd = `aptos move run --function-id ${functionId} --type-args ${typeArgs} --args ${argsStr} --private-key ${ESCROW_CREATOR_PRIVATE_KEY} --url ${RPC_URL}`;

        const attemptText = retryCount > 0 ? ` (Attempt ${retryCount + 1}/${maxRetries + 1})` : "";
        console.log(`\n🚀 Step 1: Escrow Creator creating escrow on-chain...${attemptText}`);
        console.log("SHA3-256 Hash:", hash);
        console.log("Command:", cmd);
        console.log("\n⏳ Executing transaction...");
        
        execSync(cmd, { stdio: 'inherit', env: cleanEnv });
        console.log("\n✅ Escrow created successfully by creator!");
        
        return true;
    } catch (error) {
        console.error(`\n❌ Escrow creation failed (Attempt ${retryCount + 1}/${maxRetries + 1}):`, error.message);
        
        if (retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 2000; // Exponential backoff: 2s, 4s, 8s
            console.log(`⏳ Retrying in ${waitTime/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return escrowCreatorCreateEscrow(retryCount + 1, maxRetries);
        } else {
            console.error(`❌ All ${maxRetries + 1} attempts failed for escrow creation`);
            return false;
        }
    }
}

async function takerRevealSecret(retryCount = 0, maxRetries = 3) {
    try {
        const { cleanEnv } = createEscrowCommand();
        
        const functionId = `${CONTRACT_ADDRESS}::fusion_swap_v3_coin::reveal_secret`;
        const typeArgs = `${CONTRACT_ADDRESS}::A3mock_token::MockToken`;
        const args = [
            `string:${ORDER_ID}`,
            `address:${ESCROW_CREATOR_ADDRESS}`,
            `hex:${Buffer.from(SECRET).toString('hex')}`
        ];
        const argsStr = args.join(' ');
        const cmd = `aptos move run --function-id ${functionId} --type-args ${typeArgs} --args ${argsStr} --private-key ${TAKER_PRIVATE_KEY} --url ${RPC_URL}`;

        const attemptText = retryCount > 0 ? ` (Attempt ${retryCount + 1}/${maxRetries + 1})` : "";
        console.log(`\n🔓 Step 2: Taker revealing secret to unlock escrow...${attemptText}`);
        console.log("Secret (hex):", Buffer.from(SECRET).toString('hex'));
        console.log("Command:", cmd);
        console.log("\n⏳ Executing transaction...");
        
        execSync(cmd, { stdio: 'inherit', env: cleanEnv });
        console.log("\n✅ Taker revealed secret and unlocked escrow!");
        console.log("🎉 Tokens transferred to taker successfully!");
        
        return true;
    } catch (error) {
        console.error(`\n❌ Taker reveal secret failed (Attempt ${retryCount + 1}/${maxRetries + 1}):`, error.message);
        
        if (retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 2000; // Exponential backoff: 2s, 4s, 8s
            console.log(`⏳ Retrying in ${waitTime/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return takerRevealSecret(retryCount + 1, maxRetries);
        } else {
            console.error(`❌ All ${maxRetries + 1} attempts failed for secret reveal`);
            return false;
        }
    }
}

function checkEscrowStatus() {
    try {
        const { cleanEnv } = createEscrowCommand();
        
        console.log("\n🔍 Checking escrow status...");
        const functionId = `${CONTRACT_ADDRESS}::fusion_swap_v3_coin::get_escrow`;
        const typeArgs = `${CONTRACT_ADDRESS}::A3mock_token::MockToken`;
        const args = [
            `string:${ORDER_ID}`,
            `address:${ESCROW_CREATOR_ADDRESS}`
        ];
        const argsStr = args.join(' ');
        const cmd = `aptos move view --function-id ${functionId} --type-args ${typeArgs} --args ${argsStr} --url ${RPC_URL}`;

        console.log("View command:", cmd);
        execSync(cmd, { stdio: 'inherit', env: cleanEnv });
        
    } catch (error) {
        console.log("⚠️ Could not check escrow status:", error.message);
    }
}

// Main execution flow
async function runEscrowTest() {
    console.log("🏗️ Automated Escrow Test Script");
    console.log("📅 " + new Date().toLocaleString());
    
    // Validate environment
    validateEnvironment();
    
    // Display configuration
    displayConfiguration();
    
    console.log("\n🚀 Starting Escrow Test Flow...\n");
    
    // Step 1: Create escrow (with retry)
    const escrowCreated = await escrowCreatorCreateEscrow();
    if (!escrowCreated) {
        console.log("❌ Test failed at escrow creation step");
        process.exit(1);
    }
    
    // Optional: Check escrow status
    console.log("\n⏳ Waiting 3 seconds before checking status...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    checkEscrowStatus();
    
    // Wait 5 seconds before revealing
    console.log("\n⏳ Waiting 5 seconds before taker reveals secret...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 2: Taker reveals secret (with retry)
    const secretRevealed = await takerRevealSecret();
    if (!secretRevealed) {
        console.log("❌ Test failed at secret reveal step");
        process.exit(1);
    }
    
    // Final success message
    console.log("\n" + "=".repeat(70));
    console.log("🎉 ESCROW TEST COMPLETED SUCCESSFULLY!");
    console.log("✅ Escrow created, secret revealed, tokens transferred!");
    console.log("📊 Test Results:");
    console.log("   Order ID:", ORDER_ID);
    console.log("   Creator:", ESCROW_CREATOR_ADDRESS);
    console.log("   Taker:", TAKER_ADDRESS);
    console.log("   Amount:", AMOUNT, "raw units (1000 tokens)");
    console.log("🔗 Explorer:", `https://explorer.aptoslabs.com/account/${TAKER_ADDRESS}?network=testnet`);
    console.log("=".repeat(70));
}

// Run the test
runEscrowTest().catch(error => {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
});