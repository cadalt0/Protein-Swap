const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { KeyPair } = require('near-api-js/lib/utils/key_pair');
const { connect, keyStores, KeyPair: NEARKeyPair } = require('near-api-js');

// Load environment variables
require('dotenv').config();

// Configuration from environment variables
const CONFIG = {
    networkId: process.env.NEAR_NETWORK_ID || 'testnet',
    nodeUrl: process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org',
    ownerPrivateKey: process.env.OWNER_PRIVATE_KEY,
    tokenPrivateKey: process.env.TOKEN_PRIVATE_KEY,
    tokenAccountId: process.env.TOKEN_ACCOUNT_ID,
    ownerAccountId: process.env.OWNER_ACCOUNT_ID,
    wasmPath: process.env.WASM_PATH || './target/near/v1tokens.wasm',
    totalSupply: process.env.TOTAL_SUPPLY || '1000000000000000000000000', // 1 million tokens with 24 decimals
    gasLimit: process.env.GAS_LIMIT || '300000000000000',
    attachedDeposit: process.env.ATTACHED_DEPOSIT || '0'
};

// Validate required environment variables
function validateConfig() {
    const requiredVars = [
        'OWNER_PRIVATE_KEY',
        'TOKEN_PRIVATE_KEY', 
        'TOKEN_ACCOUNT_ID',
        'OWNER_ACCOUNT_ID'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:');
        missingVars.forEach(varName => console.error(`   - ${varName}`));
        console.error('\nPlease check your .env file and ensure all required variables are set.');
        process.exit(1);
    }
    
    console.log('✅ All required environment variables are set');
}

// Initialize NEAR connection
async function initNear() {
    try {
        const keyStore = new keyStores.InMemoryKeyStore();
        
        // Add key for the token account
        const tokenKeyPair = NEARKeyPair.fromString(CONFIG.tokenPrivateKey);
        await keyStore.setKey(CONFIG.networkId, CONFIG.tokenAccountId, tokenKeyPair);
        
        // Add key for the owner account (for minting later)
        const ownerKeyPair = NEARKeyPair.fromString(CONFIG.ownerPrivateKey);
        await keyStore.setKey(CONFIG.networkId, CONFIG.ownerAccountId, ownerKeyPair);
        
        const near = await connect({
            networkId: CONFIG.networkId,
            nodeUrl: CONFIG.nodeUrl,
            keyStore: keyStore,
            headers: {}
        });
        
        return near;
    } catch (error) {
        console.error('❌ Error initializing NEAR connection:', error);
        throw error;
    }
}

// Deploy contract
async function deployContract() {
    try {
        console.log('🚀 Starting token contract deployment...');
        console.log(`📡 Network: ${CONFIG.networkId}`);
        console.log(`🔗 Node URL: ${CONFIG.nodeUrl}`);
        console.log(`🏗️ Token Account: ${CONFIG.tokenAccountId}`);
        console.log(`👤 Owner Account: ${CONFIG.ownerAccountId}`);
        
        // Initialize NEAR
        const near = await initNear();
        const account = await near.account(CONFIG.tokenAccountId);
        
        // Check if WASM file exists
        if (!fs.existsSync(CONFIG.wasmPath)) {
            throw new Error(`WASM file not found at: ${CONFIG.wasmPath}`);
        }
        
        // Read WASM file
        console.log(`📖 Reading WASM file from: ${CONFIG.wasmPath}`);
        const wasmBuffer = fs.readFileSync(CONFIG.wasmPath);
        const wasmBase64 = wasmBuffer.toString('base64');
        
        // Deploy contract
        console.log('📦 Deploying contract...');
        const result = await account.deployContract(wasmBuffer);
        console.log('✅ Contract deployed successfully!');
        console.log('Transaction hash:', result.transaction.hash);
        
        // Initialize contract
        console.log('🔧 Initializing contract...');
        const initResult = await account.functionCall({
            contractId: CONFIG.tokenAccountId,
            methodName: 'new',
            args: {
                owner_id: CONFIG.ownerAccountId,
                total_supply: CONFIG.totalSupply
            },
            gas: CONFIG.gasLimit,
            attachedDeposit: CONFIG.attachedDeposit
        });
        
        console.log('✅ Contract initialized successfully!');
        console.log('Initialization transaction hash:', initResult.transaction.hash);
        
        // Verify deployment
        console.log('🔍 Verifying deployment...');
        const metadata = await account.viewFunction({
            contractId: CONFIG.tokenAccountId,
            methodName: 'ft_metadata',
            args: {}
        });
        
        console.log('📊 Token Metadata:', metadata);
        
        const totalSupply = await account.viewFunction({
            contractId: CONFIG.tokenAccountId,
            methodName: 'ft_total_supply',
            args: {}
        });
        
        console.log('💰 Total Supply:', totalSupply);
        
        console.log('🎉 Token deployment completed successfully!');
        console.log(`Token Contract: ${CONFIG.tokenAccountId}`);
        console.log(`Owner: ${CONFIG.ownerAccountId}`);
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        throw error;
    }
}

// Mint tokens (optional)
async function mintTokens(amount = process.env.MINT_AMOUNT || '100000000000000000000000') {
    try {
        console.log('🪙 Minting tokens...');
        console.log(`Amount: ${amount}`);
        
        const near = await initNear();
        const account = await near.account(CONFIG.ownerAccountId);
        
        const result = await account.functionCall({
            contractId: CONFIG.tokenAccountId,
            methodName: 'mint',
            args: {
                account_id: CONFIG.ownerAccountId,
                amount: amount
            },
            gas: CONFIG.gasLimit,
            attachedDeposit: '1' // 1 yoctoNEAR
        });
        
        console.log('✅ Tokens minted successfully!');
        console.log('Transaction hash:', result.transaction.hash);
        
    } catch (error) {
        console.error('❌ Minting failed:', error);
        throw error;
    }
}

// Display current configuration
function displayConfig() {
    console.log('📋 Current Configuration:');
    console.log(`   Network ID: ${CONFIG.networkId}`);
    console.log(`   Node URL: ${CONFIG.nodeUrl}`);
    console.log(`   Token Account: ${CONFIG.tokenAccountId}`);
    console.log(`   Owner Account: ${CONFIG.ownerAccountId}`);
    console.log(`   WASM Path: ${CONFIG.wasmPath}`);
    console.log(`   Total Supply: ${CONFIG.totalSupply}`);
    console.log(`   Gas Limit: ${CONFIG.gasLimit}`);
    console.log(`   Attached Deposit: ${CONFIG.attachedDeposit}`);
    console.log('');
}

// Main execution
async function main() {
    try {
        // Validate configuration
        validateConfig();
        
        // Display current configuration
        displayConfig();
        
        await deployContract();
        
        // Check if minting is enabled
        if (process.env.ENABLE_MINTING === 'true') {
            console.log('🪙 Minting enabled, proceeding with token minting...');
            await mintTokens();
        }
        
    } catch (error) {
        console.error('❌ Script execution failed:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { deployContract, mintTokens, validateConfig }; 