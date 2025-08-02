const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config();

// Load configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;
const RPC_URL = process.env.RPC_URL || "https://aptos-testnet.public.blastapi.io";

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
    
    // Validate that values are not placeholders
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
}

function deploy() {
    try {
        // Validate environment variables first
        validateEnvironment();
        
        console.log("🚀 Deploying Atomic Swap contract to Aptos Testnet...");
        console.log("Account Address:", ACCOUNT_ADDRESS);
        console.log("RPC URL:", RPC_URL);
        
        // Change to contract directory (exactly like original deploy.js)
        process.chdir(path.join(__dirname, '../../contract'));
        
        // Deploy using existing aptos CLI directly (exactly like original deploy.js)
        console.log("Deploying modules using existing aptos CLI...");
        const deployCommand = `aptos move publish --private-key ${PRIVATE_KEY} --url ${RPC_URL} --assume-yes`;
        
        console.log("Running deployment...");
        console.log(`Command: ${deployCommand}`);
        
        // Use execSync with stdio: 'inherit' to see real-time output (exactly like original deploy.js)
        // Clear node_modules from PATH to force system CLI usage
        const cleanEnv = { ...process.env };
        const currentPath = cleanEnv.PATH || cleanEnv.Path || '';
        const nodeModulesPath = path.join(__dirname, '../../node_modules/.bin');
        cleanEnv.PATH = currentPath.split(path.delimiter)
            .filter(p => !p.includes('node_modules'))
            .join(path.delimiter);
            
        execSync(deployCommand, { 
            stdio: 'inherit',
            env: cleanEnv
        });
        
        // If we get here, deployment was successful (exactly like original deploy.js)
        console.log("\n✅ Deployment successful!");
        console.log("\n🎉 All modules deployed successfully!");
        console.log("Account address:", ACCOUNT_ADDRESS);
        console.log("Modules deployed:");
        console.log("- A3mock_token");
        console.log("- fusion_swap_v3_coin");
        console.log("\nModules are automatically initialized during deployment.");
        console.log(`🔗 Explorer: https://explorer.aptoslabs.com/account/${ACCOUNT_ADDRESS}?network=testnet`);
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        process.exit(1);
    }
}

deploy();