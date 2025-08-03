const TronWeb = require('tronweb');
require('dotenv').config();

// Load configuration from environment variables
const PRIVATE_KEY_OWNER = process.env.PRIVATE_KEY_OWNER;
const PRIVATE_KEY_TAKER = process.env.PRIVATE_KEY_TAKER;
const TAKER_ADDRESS = process.env.TAKER_ADDRESS;
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const RPC_URL = process.env.RPC_URL || 'https://api.shasta.trongrid.io';

// Validate required environment variables
function validateEnvironment() {
    const required = [
        'PRIVATE_KEY_OWNER',
        'PRIVATE_KEY_TAKER',
        'TAKER_ADDRESS',
        'ESCROW_CONTRACT_ADDRESS',
        'TOKEN_ADDRESS'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Verify that taker private key matches the provided taker address
    const derivedTakerAddress = tronWebTaker.address.fromPrivateKey(PRIVATE_KEY_TAKER);
    if (derivedTakerAddress !== TAKER_ADDRESS) {
        throw new Error(`Taker private key does not match the provided taker address. Expected: ${TAKER_ADDRESS}, Got: ${derivedTakerAddress}`);
    }
}

// Generate random order ID
function generateRandomOrderId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ORDER_${timestamp}_${random}`;
}

// Generate random secret
function generateRandomSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Initialize TronWeb instances
const tronWebOwner = new TronWeb({
    fullHost: RPC_URL,
    privateKey: PRIVATE_KEY_OWNER
});

const tronWebTaker = new TronWeb({
    fullHost: RPC_URL,
    privateKey: PRIVATE_KEY_TAKER
});

// Generate hash from secret using same method as contract (keccak256)
function generateHash(secret) {
    try {
        return TronWeb.sha3(secret);
    } catch (error) {
        console.error('Error generating hash:', error);
        try {
            return TronWeb.utils.ethersUtils.keccak256(TronWeb.utils.ethersUtils.toUtf8Bytes(secret));
        } catch (fallbackError) {
            console.error('Fallback hash generation failed:', fallbackError);
            throw fallbackError;
        }
    }
}

// Convert string to bytes - must match how Solidity receives the bytes
function stringToBytes(str) {
    try {
        return TronWeb.utils.ethersUtils.toUtf8Bytes(str);
    } catch (error) {
        console.error('Error converting string to bytes with ethers utils:', error);
        try {
            const buffer = Buffer.from(str, 'utf8');
            let hex = buffer.toString('hex');
            
            if (hex.length % 2 !== 0) {
                hex = '0' + hex;
            }
            
            return '0x' + hex;
        } catch (fallbackError) {
            console.error('Error converting string to bytes:', fallbackError);
            throw fallbackError;
        }
    }
}

async function createEscrow(orderId, secret, tokenAmount, timelockDuration) {
    try {
        console.log('🚀 Starting atomic swap escrow creation...');
        console.log('📋 Configuration:');
        console.log(`   Order ID: ${orderId}`);
        console.log(`   Secret: ${secret}`);
        console.log(`   Token Amount: ${tokenAmount} (${parseInt(tokenAmount) / 1e18} tokens)`);
        console.log(`   Timelock: ${timelockDuration} seconds`);
        console.log('');

        // Get addresses from private keys
        const ownerAddress = tronWebOwner.address.fromPrivateKey(PRIVATE_KEY_OWNER);
        console.log(`👤 Owner Address: ${ownerAddress}`);
        console.log(`👤 Taker Address: ${TAKER_ADDRESS}`);

        // Generate hash from secret
        const secretHash = generateHash(secret);
        console.log(`🔐 Secret Hash: ${secretHash}`);

        // Create escrow contract instance
        const escrowContract = await tronWebOwner.contract().at(ESCROW_CONTRACT_ADDRESS);
        
        console.log('📝 Creating escrow...');
        
        // First, approve the escrow contract to spend tokens
        console.log('🔐 Approving token transfer...');
        const tokenContract = await tronWebOwner.contract().at(TOKEN_ADDRESS);
        
        const approveResult = await tokenContract.approve(ESCROW_CONTRACT_ADDRESS, tokenAmount).send({
            feeLimit: 1000000000,
            callValue: 0
        });
        console.log('✅ Token approval successful');
        console.log(`📄 Approval Transaction ID: ${approveResult}`);

        // Wait a moment for approval to be processed
        console.log('⏳ Waiting for approval confirmation...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Create the escrow
        const createResult = await escrowContract.createEscrow(
            orderId,
            secretHash,
            TAKER_ADDRESS,
            TOKEN_ADDRESS,
            tokenAmount,
            timelockDuration
        ).send({
            feeLimit: 1000000000,
            callValue: 0
        });

        console.log('✅ Escrow created successfully!');
        console.log(`📄 Transaction ID: ${createResult}`);
        console.log(`🔗 View on Tronscan: https://shasta.tronscan.org/#/transaction/${createResult}`);
        
        return true;

    } catch (error) {
        console.error('❌ Error creating escrow:', error);
        if (error.message) {
            console.error('Error message:', error.message);
        }
        return false;
    }
}

async function unlockEscrow(orderId, secret, ownerAddress) {
    try {
        console.log('\n🔓 Starting escrow unlock process...');
        
        console.log(`👤 Taker Address: ${TAKER_ADDRESS}`);

        // Create escrow contract instance
        const escrowContract = await tronWebTaker.contract().at(ESCROW_CONTRACT_ADDRESS);
        
        console.log('📝 Revealing secret to unlock escrow...');
        
        // Convert secret to bytes
        const secretBytes = stringToBytes(secret);
        console.log(`🔐 Secret bytes: ${secretBytes}`);
        
        // Reveal the secret
        const unlockResult = await escrowContract.revealSecret(
            orderId,
            ownerAddress,
            secretBytes
        ).send({
            feeLimit: 1000000000,
            callValue: 0
        });

        console.log('✅ Escrow unlocked successfully!');
        console.log(`📄 Transaction ID: ${unlockResult}`);
        console.log(`🔗 View on Tronscan: https://shasta.tronscan.org/#/transaction/${unlockResult}`);
        
        // Wait a moment for transaction confirmation
        console.log('⏳ Waiting for transaction confirmation...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        return true;

    } catch (error) {
        console.error('❌ Error unlocking escrow:', error);
        if (error.message) {
            console.error('Error message:', error.message);
        }
        return false;
    }
}

async function checkEscrowStatus(orderId, ownerAddress) {
    try {
        console.log('\n📊 Checking escrow status...');
        
        const escrowContract = await tronWebOwner.contract().at(ESCROW_CONTRACT_ADDRESS);
        
        // Check if escrow exists
        const exists = await escrowContract.escrowExists(orderId, ownerAddress).call();
        console.log(`📋 Escrow exists: ${exists}`);
        
        if (exists) {
            // Get escrow details
            const escrowDetails = await escrowContract.getEscrow(orderId, ownerAddress).call();
            console.log('📋 Escrow details:');
            console.log(`   Order ID: ${escrowDetails[0]}`);
            console.log(`   Hash: ${escrowDetails[1]}`);
            console.log(`   Owner: ${escrowDetails[2]}`);
            console.log(`   Taker: ${escrowDetails[3]}`);
            console.log(`   Token: ${escrowDetails[4]}`);
            console.log(`   Amount: ${escrowDetails[5]} (${parseInt(escrowDetails[5]) / 1e18} tokens)`);
            console.log(`   Timelock: ${escrowDetails[6]}`);
            console.log(`   Status: ${escrowDetails[7]}`);
            console.log(`   Created: ${escrowDetails[8]}`);
            
            // Check if active
            const isActive = await escrowContract.isEscrowActive(orderId, ownerAddress).call();
            console.log(`🟢 Escrow active: ${isActive}`);
            
            // Check if timelock expired
            const isExpired = await escrowContract.isTimelockExpired(orderId, ownerAddress).call();
            console.log(`⏰ Timelock expired: ${isExpired}`);
        }
        
    } catch (error) {
        console.error('❌ Error checking escrow status:', error);
        if (error.message) {
            console.error('Error message:', error.message);
        }
    }
}

async function runAtomicSwapTest() {
    try {
        // Validate environment variables
        validateEnvironment();
        
        console.log('🎯 Atomic Swap HTLC Test Script (Environment-based)');
        console.log('==================================================');
        
        // Generate random order ID and secret
        const orderId = generateRandomOrderId();
        const secret = generateRandomSecret();
        const tokenAmount = process.env.TOKEN_AMOUNT || '10000000000000000000'; // 10 tokens with 18 decimals
        const timelockDuration = parseInt(process.env.TIMELOCK_DURATION) || 3600; // 1 hour in seconds
        
        console.log('🎲 Generated random values:');
        console.log(`   Order ID: ${orderId}`);
        console.log(`   Secret: ${secret}`);
        console.log('');
        
        // Get owner address
        const ownerAddress = tronWebOwner.address.fromPrivateKey(PRIVATE_KEY_OWNER);
        
        // Step 1: Create escrow
        console.log('\n📝 STEP 1: Creating Escrow');
        console.log('==========================');
        const escrowCreated = await createEscrow(orderId, secret, tokenAmount, timelockDuration);
        
        if (!escrowCreated) {
            console.error('💥 Failed to create escrow. Stopping.');
            return;
        }
        
        // Check escrow status after creation
        await checkEscrowStatus(orderId, ownerAddress);
        
        // Step 2: Wait 5 seconds
        console.log('\n⏳ STEP 2: Waiting 5 seconds...');
        console.log('==============================');
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('✅ 5 seconds elapsed');
        
        // Step 3: Unlock escrow (using taker instead of contract admin)
        console.log('\n🔓 STEP 3: Unlocking Escrow (by Taker)');
        console.log('========================================');
        const escrowUnlocked = await unlockEscrow(orderId, secret, ownerAddress);
        
        if (!escrowUnlocked) {
            console.error('💥 Failed to unlock escrow.');
            return;
        }
        
        // Final status check
        await checkEscrowStatus(orderId, ownerAddress);
        
        console.log('\n🎉 Atomic swap test completed!');
        console.log(`📋 Final Summary:`);
        console.log(`   Order ID: ${orderId}`);
        console.log(`   Secret: ${secret}`);
        console.log(`   Owner: ${ownerAddress}`);
        console.log(`   Taker: ${TAKER_ADDRESS}`);
        
    } catch (error) {
        console.error('\n💥 Test failed:', error);
        console.error('Please check your environment variables and try again.');
    }
}

// Run the test
runAtomicSwapTest().catch((error) => {
    console.error('\n💥 Test failed:', error);
}); 