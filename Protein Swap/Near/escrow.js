const { connect, keyStores, KeyPair } = require('near-api-js');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

// Configuration from environment variables
const CONFIG = {
    networkId: process.env.NEAR_NETWORK_ID || 'testnet',
    nodeUrl: process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org',
    // User Q's credentials (escrow creator)
    userQPrivateKey: process.env.USER_Q_PRIVATE_KEY,
    userQAccountId: process.env.USER_Q_ACCOUNT_ID,
    // Taker's credentials (secret revealer)
    takerPrivateKey: process.env.TAKER_PRIVATE_KEY,
    takerAccountId: process.env.TAKER_ACCOUNT_ID,
    // Contract addresses
    tokenAccountId: process.env.TOKEN_ACCOUNT_ID,
    escrowAccountId: process.env.ESCROW_ACCOUNT_ID,
    // Escrow parameters
    amount: process.env.ESCROW_AMOUNT || '10000000000000000000000', // 10 UNITE tokens default
    timelockDuration: parseInt(process.env.TIMELOCK_DURATION) || 3600 // 1 hour default
};

// Validate required environment variables
function validateConfig() {
    const requiredVars = [
        'USER_Q_PRIVATE_KEY',
        'USER_Q_ACCOUNT_ID',
        'TAKER_PRIVATE_KEY',
        'TAKER_ACCOUNT_ID',
        'TOKEN_ACCOUNT_ID',
        'ESCROW_ACCOUNT_ID'
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

// Generate random order ID
function generateOrderId() {
    return 'order-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Generate random secret
function generateSecret() {
    return crypto.randomBytes(16).toString('hex');
}

// Generate hash from secret
function generateHash(secret) {
    const hash = crypto.createHash('sha256').update(secret).digest();
    return Array.from(hash); // Convert to array of bytes
}

// Initialize NEAR connection
async function initNear() {
    try {
        const keyStore = new keyStores.InMemoryKeyStore();
        
        // Add keys for both accounts
        const userQKeyPair = KeyPair.fromString(CONFIG.userQPrivateKey);
        await keyStore.setKey(CONFIG.networkId, CONFIG.userQAccountId, userQKeyPair);
        
        const takerKeyPair = KeyPair.fromString(CONFIG.takerPrivateKey);
        await keyStore.setKey(CONFIG.networkId, CONFIG.takerAccountId, takerKeyPair);
        
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

// Display current configuration
function displayConfig(orderId, secret) {
    console.log('📋 Current Configuration:');
    console.log(`   Network ID: ${CONFIG.networkId}`);
    console.log(`   Node URL: ${CONFIG.nodeUrl}`);
    console.log(`   Token Contract: ${CONFIG.tokenAccountId}`);
    console.log(`   Escrow Contract: ${CONFIG.escrowAccountId}`);
    console.log(`   User Q: ${CONFIG.userQAccountId}`);
    console.log(`   Taker: ${CONFIG.takerAccountId}`);
    console.log(`   Amount: ${CONFIG.amount} (${parseInt(CONFIG.amount) / Math.pow(10, 24)} UNITE tokens)`);
    console.log(`   Timelock: ${CONFIG.timelockDuration} seconds`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Secret: ${secret}`);
    console.log('');
}

// Step 0: Initialize escrow contract if needed
async function initializeEscrowContract() {
    try {
        console.log('🔧 Checking if escrow contract is initialized...');
        
        const near = await initNear();
        const userQAccount = await near.account(CONFIG.userQAccountId);
        
        // Try to call a view method to check if contract is initialized
        try {
            await userQAccount.viewFunction({
                contractId: CONFIG.escrowAccountId,
                methodName: 'get_escrow_count',
                args: {}
            });
            console.log('✅ Escrow contract is already initialized');
            return;
        } catch (error) {
            if (error.message.includes('not initialized')) {
                console.log('⚡ Initializing escrow contract...');
                
                // Initialize the contract
                const initResult = await userQAccount.functionCall({
                    contractId: CONFIG.escrowAccountId,
                    methodName: 'new',
                    args: {},
                    gas: '300000000000000',
                    attachedDeposit: '0'
                });
                
                console.log('✅ Escrow contract initialized successfully!');
                console.log('Transaction hash:', initResult.transaction.hash);
            } else {
                throw error;
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize escrow contract:', error);
        throw error;
    }
}

// Step 1: User Q creates escrow
async function createEscrow(orderId, secret) {
    try {
        console.log('🔐 Step 1: User Q creating escrow...');
        
        const near = await initNear();
        const userQAccount = await near.account(CONFIG.userQAccountId);
        
        // Generate hash from secret
        const hash = generateHash(secret);
        console.log(`Hash: ${Buffer.from(hash).toString('hex')}`);
        
        // First, transfer tokens to escrow contract
        console.log('💸 Transferring tokens to escrow contract...');
        const transferResult = await userQAccount.functionCall({
            contractId: CONFIG.tokenAccountId,
            methodName: 'ft_transfer_call',
            args: {
                receiver_id: CONFIG.escrowAccountId,
                amount: CONFIG.amount,
                memo: 'Escrow deposit',
                msg: `escrow:${orderId}:${CONFIG.userQAccountId}`
            },
            gas: '300000000000000',
            attachedDeposit: '1'
        });
        
        console.log('✅ Tokens transferred to escrow contract');
        console.log('Transaction hash:', transferResult.transaction.hash);
        
        // Create escrow
        const createResult = await userQAccount.functionCall({
            contractId: CONFIG.escrowAccountId,
            methodName: 'create_escrow',
            args: {
                order_id: orderId,
                hash: hash,
                taker: CONFIG.takerAccountId,
                token_contract: CONFIG.tokenAccountId,
                amount: CONFIG.amount,
                timelock_duration: CONFIG.timelockDuration
            },
            gas: '300000000000000',
            attachedDeposit: '0'
        });
        
        console.log('✅ Escrow created successfully!');
        console.log('Transaction hash:', createResult.transaction.hash);
        
        // Verify escrow was created
        const escrowExists = await userQAccount.viewFunction({
            contractId: CONFIG.escrowAccountId,
            methodName: 'escrow_exists',
            args: {
                order_id: orderId,
                owner: CONFIG.userQAccountId
            }
        });
        
        console.log('🔍 Escrow exists:', escrowExists);
        
        if (escrowExists) {
            const escrow = await userQAccount.viewFunction({
                contractId: CONFIG.escrowAccountId,
                methodName: 'get_escrow',
                args: {
                    order_id: orderId,
                    owner: CONFIG.userQAccountId
                }
            });
            
            console.log('📋 Escrow details:', escrow);
        }
        
    } catch (error) {
        console.error('❌ Failed to create escrow:', error);
        throw error;
    }
}

// Step 2: Wait 5 seconds
async function wait5Seconds() {
    console.log('⏳ Waiting 5 seconds before revealing secret...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('✅ 5 seconds elapsed');
}

// Step 3: Taker reveals secret (changed from owner to taker)
async function revealSecret(orderId, secret) {
    try {
        console.log('🔓 Step 2: Taker revealing secret...');
        console.log(`Secret: ${secret}`);
        
        const near = await initNear();
        const takerAccount = await near.account(CONFIG.takerAccountId);
        
        // Convert secret to byte array
        const secretBytes = Array.from(Buffer.from(secret, 'utf8'));
        
        const result = await takerAccount.functionCall({
            contractId: CONFIG.escrowAccountId,
            methodName: 'reveal_secret',
            args: {
                order_id: orderId,
                owner: CONFIG.userQAccountId,
                secret: secretBytes
            },
            gas: '300000000000000',
            attachedDeposit: '0'
        });
        
        console.log('✅ Secret revealed successfully!');
        console.log('Transaction hash:', result.transaction.hash);
        
        // Check escrow status
        const escrow = await takerAccount.viewFunction({
            contractId: CONFIG.escrowAccountId,
            methodName: 'get_escrow',
            args: {
                order_id: orderId,
                owner: CONFIG.userQAccountId
            }
        });
        
        console.log('📋 Updated escrow details:', escrow);
        
        // Check balances
        console.log('💰 Checking balances...');
        
        const userQBalance = await takerAccount.viewFunction({
            contractId: CONFIG.tokenAccountId,
            methodName: 'ft_balance_of',
            args: { account_id: CONFIG.userQAccountId }
        });
        
        const takerBalance = await takerAccount.viewFunction({
            contractId: CONFIG.tokenAccountId,
            methodName: 'ft_balance_of',
            args: { account_id: CONFIG.takerAccountId }
        });
        
        console.log(`User Q balance: ${userQBalance} (${parseInt(userQBalance) / Math.pow(10, 24)} UNITE tokens)`);
        console.log(`Taker balance: ${takerBalance} (${parseInt(takerBalance) / Math.pow(10, 24)} UNITE tokens)`);
        
    } catch (error) {
        console.error('❌ Failed to reveal secret:', error);
        throw error;
    }
}

// Check balances before and after
async function checkBalances() {
    try {
        console.log('💰 Checking current balances...');
        
        const near = await initNear();
        const account = await near.account(CONFIG.userQAccountId);
        
        const userQBalance = await account.viewFunction({
            contractId: CONFIG.tokenAccountId,
            methodName: 'ft_balance_of',
            args: { account_id: CONFIG.userQAccountId }
        });
        
        const takerBalance = await account.viewFunction({
            contractId: CONFIG.tokenAccountId,
            methodName: 'ft_balance_of',
            args: { account_id: CONFIG.takerAccountId }
        });
        
        console.log(`User Q balance: ${userQBalance} (${parseInt(userQBalance) / Math.pow(10, 24)} UNITE tokens)`);
        console.log(`Taker balance: ${takerBalance} (${parseInt(takerBalance) / Math.pow(10, 24)} UNITE tokens)`);
        
    } catch (error) {
        console.error('❌ Failed to check balances:', error);
        throw error;
    }
}

// Main execution
async function main() {
    try {
        const args = process.argv.slice(2);
        const command = args[0] || 'demo';
        
        // Validate configuration
        validateConfig();
        
        // Generate random order ID and secret for each run
        const orderId = generateOrderId();
        const secret = generateSecret();
        
        // Display current configuration
        displayConfig(orderId, secret);
        
        switch (command) {
            case 'demo':
                console.log('🚀 Starting Atomic Swap Escrow Demo');
                console.log('='.repeat(50));
                
                // Step 0: Initialize contract if needed
                await initializeEscrowContract();
                console.log('');
                
                // Check initial balances
                await checkBalances();
                console.log('');
                
                // Step 1: Create escrow
                await createEscrow(orderId, secret);
                console.log('');
                
                // Step 2: Wait 5 seconds
                await wait5Seconds();
                console.log('');
                
                // Step 3: Reveal secret (by taker)
                await revealSecret(orderId, secret);
                console.log('');
                
                console.log('🎉 Atomic Swap Demo Completed Successfully!');
                break;
                
            case 'create':
                await initializeEscrowContract();
                await createEscrow(orderId, secret);
                break;
                
            case 'reveal':
                // For manual reveal, use provided order ID and secret
                const manualOrderId = args[1] || orderId;
                const manualSecret = args[2] || secret;
                await revealSecret(manualOrderId, manualSecret);
                break;
                
            case 'balances':
                await checkBalances();
                break;
                
            case 'init':
                await initializeEscrowContract();
                break;
                
            default:
                console.log('Usage:');
                console.log('  node escrow.js demo                        - Run complete demo');
                console.log('  node escrow.js create                      - Create escrow only');
                console.log('  node escrow.js reveal [orderId] [secret]   - Reveal secret');
                console.log('  node escrow.js balances                    - Check balances');
                console.log('  node escrow.js init                        - Initialize escrow contract only');
                console.log('');
                console.log('Features:');
                console.log('  - Random order ID and secret generated for each run');
                console.log('  - Taker reveals the secret (not owner)');
                console.log('  - All configuration loaded from environment variables');
                console.log('');
                console.log('Current Demo Parameters:');
                console.log(`  Order ID: ${orderId} (random)`);
                console.log(`  Secret: ${secret} (random)`);
                console.log(`  Amount: ${CONFIG.amount} (${parseInt(CONFIG.amount) / Math.pow(10, 24)} UNITE tokens)`);
                console.log(`  User Q: ${CONFIG.userQAccountId}`);
                console.log(`  Taker: ${CONFIG.takerAccountId}`);
        }
        
    } catch (error) {
        console.error('❌ Demo execution failed:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { createEscrow, revealSecret, checkBalances, initializeEscrowContract };