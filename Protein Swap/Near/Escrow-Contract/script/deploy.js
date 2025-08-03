const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { connect, keyStores, KeyPair } = require('near-api-js');

// Load environment variables
require('dotenv').config();

// Configuration from environment variables
const CONFIG = {
    networkId: process.env.NEAR_NETWORK_ID || 'testnet',
    nodeUrl: process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org',
    ownerPrivateKey: process.env.OWNER_PRIVATE_KEY,
    escrowPrivateKey: process.env.ESCROW_PRIVATE_KEY,
    escrowAccountId: process.env.ESCROW_ACCOUNT_ID,
    ownerAccountId: process.env.OWNER_ACCOUNT_ID,
    wasmPath: process.env.WASM_PATH || './target/near/v1.wasm',
    gasLimit: process.env.GAS_LIMIT || '300000000000000',
    attachedDeposit: process.env.ATTACHED_DEPOSIT || '0',
    tokenContract: process.env.TOKEN_CONTRACT || 'unite.bigseal2466.testnet'
};

// Validate required environment variables
function validateConfig() {
    const requiredVars = [
        'OWNER_PRIVATE_KEY',
        'ESCROW_PRIVATE_KEY', 
        'ESCROW_ACCOUNT_ID',
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
        
        // Add key for the escrow account
        const escrowKeyPair = KeyPair.fromString(CONFIG.escrowPrivateKey);
        await keyStore.setKey(CONFIG.networkId, CONFIG.escrowAccountId, escrowKeyPair);
        
        // Add key for the owner account
        const ownerKeyPair = KeyPair.fromString(CONFIG.ownerPrivateKey);
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

// Deploy escrow contract
async function deployEscrowContract() {
    try {
        console.log('🚀 Starting escrow contract deployment...');
        console.log(`📡 Network: ${CONFIG.networkId}`);
        console.log(`🔗 Node URL: ${CONFIG.nodeUrl}`);
        console.log(`🏗️ Escrow Account: ${CONFIG.escrowAccountId}`);
        console.log(`👤 Owner Account: ${CONFIG.ownerAccountId}`);
        console.log(`🪙 Token Contract: ${CONFIG.tokenContract}`);
        
        // Initialize NEAR
        const near = await initNear();
        const account = await near.account(CONFIG.escrowAccountId);
        
        // Check if WASM file exists
        if (!fs.existsSync(CONFIG.wasmPath)) {
            throw new Error(`WASM file not found at: ${CONFIG.wasmPath}`);
        }
        
        // Read WASM file
        console.log(`📖 Reading WASM file from: ${CONFIG.wasmPath}`);
        const wasmBuffer = fs.readFileSync(CONFIG.wasmPath);
        
        // Deploy contract
        console.log('📦 Deploying escrow contract...');
        const result = await account.deployContract(wasmBuffer);
        console.log('✅ Escrow contract deployed successfully!');
        console.log('Transaction hash:', result.transaction.hash);
        
        // Initialize contract (escrow contract doesn't need initialization like tokens)
        console.log('🔧 Escrow contract is ready to use!');
        
        console.log('🎉 Escrow contract deployment completed successfully!');
        console.log(`Escrow Contract: ${CONFIG.escrowAccountId}`);
        console.log(`Owner: ${CONFIG.ownerAccountId}`);
        console.log(`Token Contract: ${CONFIG.tokenContract}`);
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        throw error;
    }
}

// Test escrow functionality
async function testEscrow() {
    try {
        console.log('🧪 Testing escrow functionality...');
        
        const near = await initNear();
        const account = await near.account(CONFIG.ownerAccountId);
        
        // Test creating an escrow
        const orderId = 'test-order-' + Date.now();
        const hash = 'a'.repeat(32); // 32 bytes hash
        const taker = process.env.TEST_TAKER || 'alice.testnet';
        const amount = process.env.TEST_AMOUNT || '10000000000000000000000'; // 10 tokens
        const timelockDuration = parseInt(process.env.TEST_TIMELOCK) || 3600; // 1 hour
        
        console.log('📝 Creating test escrow...');
        console.log(`Order ID: ${orderId}`);
        console.log(`Taker: ${taker}`);
        console.log(`Token Contract: ${CONFIG.tokenContract}`);
        console.log(`Amount: ${amount} (10 UNITE tokens)`);
        console.log(`Timelock: ${timelockDuration} seconds`);
        
        const result = await account.functionCall({
            contractId: CONFIG.escrowAccountId,
            methodName: 'create_escrow',
            args: {
                order_id: orderId,
                hash: Array.from(hash).map(c => c.charCodeAt(0)), // Convert string to byte array
                taker: taker,
                token_contract: CONFIG.tokenContract,
                amount: amount,
                timelock_duration: timelockDuration
            },
            gas: CONFIG.gasLimit,
            attachedDeposit: CONFIG.attachedDeposit
        });
        
        console.log('✅ Test escrow created successfully!');
        console.log('Transaction hash:', result.transaction.hash);
        
        // Check if escrow exists
        const escrowExists = await account.viewFunction({
            contractId: CONFIG.escrowAccountId,
            methodName: 'escrow_exists',
            args: {
                order_id: orderId,
                owner: CONFIG.ownerAccountId
            }
        });
        
        console.log('🔍 Escrow exists:', escrowExists);
        
        // Get escrow details
        const escrow = await account.viewFunction({
            contractId: CONFIG.escrowAccountId,
            methodName: 'get_escrow',
            args: {
                order_id: orderId,
                owner: CONFIG.ownerAccountId
            }
        });
        
        console.log('📋 Escrow details:', escrow);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

// Display current configuration
function displayConfig() {
    console.log('📋 Current Configuration:');
    console.log(`   Network ID: ${CONFIG.networkId}`);
    console.log(`   Node URL: ${CONFIG.nodeUrl}`);
    console.log(`   Escrow Account: ${CONFIG.escrowAccountId}`);
    console.log(`   Owner Account: ${CONFIG.ownerAccountId}`);
    console.log(`   Token Contract: ${CONFIG.tokenContract}`);
    console.log(`   WASM Path: ${CONFIG.wasmPath}`);
    console.log(`   Gas Limit: ${CONFIG.gasLimit}`);
    console.log(`   Attached Deposit: ${CONFIG.attachedDeposit}`);
    console.log('');
}

// Main execution
async function main() {
    try {
        const args = process.argv.slice(2);
        const command = args[0] || 'deploy';
        
        // Validate configuration
        validateConfig();
        
        // Display current configuration
        displayConfig();
        
        switch (command) {
            case 'deploy':
                await deployEscrowContract();
                break;
                
            case 'test':
                await testEscrow();
                break;
                
            case 'deploy-and-test':
                await deployEscrowContract();
                console.log('\n' + '='.repeat(50) + '\n');
                await testEscrow();
                break;
                
            default:
                console.log('Usage:');
                console.log('  node deploy-escrow-env.js deploy        - Deploy escrow contract');
                console.log('  node deploy-escrow-env.js test          - Test escrow functionality');
                console.log('  node deploy-escrow-env.js deploy-and-test - Deploy and test');
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

module.exports = { deployEscrowContract, testEscrow, validateConfig }; 