const { connect, keyStores, KeyPair } = require('near-api-js');

// Load environment variables
require('dotenv').config();

// Configuration from environment variables
const CONFIG = {
    networkId: process.env.NEAR_NETWORK_ID || 'testnet',
    nodeUrl: process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org',
    minterPrivateKey: process.env.MINTER_PRIVATE_KEY || process.env.OWNER_PRIVATE_KEY,
    tokenAccountId: process.env.TOKEN_ACCOUNT_ID,
    minterAccountId: process.env.MINTER_ACCOUNT_ID || process.env.OWNER_ACCOUNT_ID,
    recipientAccountId: process.env.RECIPIENT_ACCOUNT_ID || process.env.MINTER_ACCOUNT_ID || process.env.OWNER_ACCOUNT_ID,
    gasLimit: process.env.GAS_LIMIT || '300000000000000',
    attachedDeposit: process.env.ATTACHED_DEPOSIT || '1'
};

// Validate required environment variables
function validateConfig() {
    const requiredVars = [
        'TOKEN_ACCOUNT_ID'
    ];
    
    // Either MINTER credentials or OWNER credentials must be provided
    const hasMinterCreds = process.env.MINTER_PRIVATE_KEY && process.env.MINTER_ACCOUNT_ID;
    const hasOwnerCreds = process.env.OWNER_PRIVATE_KEY && process.env.OWNER_ACCOUNT_ID;
    
    if (!hasMinterCreds && !hasOwnerCreds) {
        console.error('❌ Missing minter credentials. Provide either:');
        console.error('   Option 1: MINTER_PRIVATE_KEY and MINTER_ACCOUNT_ID');
        console.error('   Option 2: OWNER_PRIVATE_KEY and OWNER_ACCOUNT_ID');
        console.error('\nPlease check your .env file and ensure required variables are set.');
        process.exit(1);
    }
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:');
        missingVars.forEach(varName => console.error(`   - ${varName}`));
        console.error('\nPlease check your .env file and ensure all required variables are set.');
        process.exit(1);
    }
    
    console.log('✅ All required environment variables are set');
    if (hasMinterCreds) {
        console.log('✅ Using minter credentials');
    } else {
        console.log('✅ Using owner credentials as fallback');
    }
}

// Initialize NEAR connection
async function initNear() {
    try {
        const keyStore = new keyStores.InMemoryKeyStore();
        
        // Add key for the minter account
        const minterKeyPair = KeyPair.fromString(CONFIG.minterPrivateKey);
        await keyStore.setKey(CONFIG.networkId, CONFIG.minterAccountId, minterKeyPair);
        
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

// Mint tokens
async function mintTokens(amount = process.env.MINT_AMOUNT || '100000000000000000000000') {
    try {
        console.log('🪙 Minting UNITE tokens...');
        console.log(`Minter: ${CONFIG.minterAccountId}`);
        console.log(`Recipient: ${CONFIG.recipientAccountId}`);
        console.log(`Amount: ${amount} (${parseInt(amount) / Math.pow(10, 24)} UNITE tokens)`);
        
        const near = await initNear();
        const account = await near.account(CONFIG.minterAccountId);
        
        const result = await account.functionCall({
            contractId: CONFIG.tokenAccountId,
            methodName: 'mint',
            args: {
                account_id: CONFIG.recipientAccountId,
                amount: amount
            },
            gas: CONFIG.gasLimit,
            attachedDeposit: '1' // 1 yoctoNEAR required by contract
        });
        
        console.log('✅ Tokens minted successfully!');
        console.log('Transaction hash:', result.transaction.hash);
        
        // Check new balance
        const balance = await account.viewFunction({
            contractId: CONFIG.tokenAccountId,
            methodName: 'ft_balance_of',
            args: { account_id: CONFIG.recipientAccountId }
        });
        
        console.log(`💰 New balance for ${CONFIG.recipientAccountId}: ${balance} (${parseInt(balance) / Math.pow(10, 24)} UNITE tokens)`);
        
    } catch (error) {
        console.error('❌ Minting failed:', error);
        throw error;
    }
}

// Transfer tokens
async function transferTokens(recipient, amount = process.env.TRANSFER_AMOUNT || '10000000000000000000000') {
    try {
        console.log('💸 Transferring UNITE tokens...');
        console.log(`From: ${CONFIG.minterAccountId}`);
        console.log(`To: ${recipient}`);
        console.log(`Amount: ${amount} (${parseInt(amount) / Math.pow(10, 24)} UNITE tokens)`);
        
        const near = await initNear();
        const account = await near.account(CONFIG.minterAccountId);
        
        const result = await account.functionCall({
            contractId: CONFIG.tokenAccountId,
            methodName: 'ft_transfer',
            args: {
                receiver_id: recipient,
                amount: amount,
                memo: 'Transfer from minter'
            },
            gas: CONFIG.gasLimit,
            attachedDeposit: '1' // 1 yoctoNEAR required by contract
        });
        
        console.log('✅ Transfer completed successfully!');
        console.log('Transaction hash:', result.transaction.hash);
        
    } catch (error) {
        console.error('❌ Transfer failed:', error);
        throw error;
    }
}

// Check balance
async function checkBalance(accountId = CONFIG.minterAccountId) {
    try {
        console.log(`💰 Checking balance for ${accountId}...`);
        
        const near = await initNear();
        const account = await near.account(CONFIG.minterAccountId);
        
        const balance = await account.viewFunction({
            contractId: CONFIG.tokenAccountId,
            methodName: 'ft_balance_of',
            args: { account_id: accountId }
        });
        
        console.log(`Balance: ${balance} (${parseInt(balance) / Math.pow(10, 24)} UNITE tokens)`);
        
    } catch (error) {
        console.error('❌ Failed to check balance:', error);
        throw error;
    }
}

// Display current configuration
function displayConfig() {
    console.log('📋 Current Configuration:');
    console.log(`   Network ID: ${CONFIG.networkId}`);
    console.log(`   Node URL: ${CONFIG.nodeUrl}`);
    console.log(`   Token Account: ${CONFIG.tokenAccountId}`);
    console.log(`   Minter Account: ${CONFIG.minterAccountId}`);
    console.log(`   Recipient Account: ${CONFIG.recipientAccountId}`);
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
        
        // Automatically mint tokens using environment variables
        const mintAmount = process.env.MINT_AMOUNT || '100000000000000000000000'; // 100 tokens default
        await mintTokens(mintAmount);
        
    } catch (error) {
        console.error('❌ Script execution failed:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { mintTokens, transferTokens, checkBalance, validateConfig }; 