const TronWeb = require('tronweb');
require('dotenv').config();

// Load configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS;
const RPC_URL = process.env.RPC_URL || 'https://api.shasta.trongrid.io';
const MINT_AMOUNT = process.env.MINT_AMOUNT || '10000000000000000000000000'; // 1000 tokens with 18 decimals

// Validate required environment variables
function validateEnvironment() {
    const required = [
        'PRIVATE_KEY',
        'TOKEN_ADDRESS',
        'RECIPIENT_ADDRESS'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

// Initialize TronWeb
const tronWeb = new TronWeb({
    fullHost: RPC_URL,
    privateKey: PRIVATE_KEY
});

// Token contract ABI (only the mint function we need)
const tokenABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

async function mintTokens() {
    try {
        console.log('🚀 Starting token minting process...');
        console.log('📋 Configuration:');
        console.log(`   Token Address: ${TOKEN_ADDRESS}`);
        console.log(`   Recipient: ${RECIPIENT_ADDRESS}`);
        console.log(`   Amount: ${MINT_AMOUNT} (${parseInt(MINT_AMOUNT) / 1e18} tokens)`);
        console.log(`   RPC: ${RPC_URL}`);
        console.log('');

        // Get the sender's address from private key
        const senderAddress = tronWeb.address.fromPrivateKey(PRIVATE_KEY);
        console.log(`👤 Sender Address: ${senderAddress}`);

        // Create contract instance
        const tokenContract = await tronWeb.contract().at(TOKEN_ADDRESS);
        
        console.log('📝 Calling mint function...');
        
        // Call the mint function
        const result = await tokenContract.mint(RECIPIENT_ADDRESS, MINT_AMOUNT).send({
            feeLimit: 1000000000, // 1000 TRX
            callValue: 0
        });

        console.log('✅ Minting successful!');
        console.log(`📄 Transaction ID: ${result}`);
        console.log(`🔗 View on Tronscan: https://shasta.tronscan.org/#/transaction/${result}`);
        
        // Wait a moment and check the balance
        console.log('⏳ Waiting for transaction confirmation...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check the recipient's balance
        const balance = await tokenContract.balanceOf(RECIPIENT_ADDRESS).call();
        console.log(`💰 New balance of ${RECIPIENT_ADDRESS}: ${balance} (${parseInt(balance) / 1e18} tokens)`);

    } catch (error) {
        console.error('❌ Error during minting:', error.message);
        
        if (error.message.includes('Only owner can call this function')) {
            console.error('💡 The sender address is not the owner of the token contract.');
            console.error('   Only the contract owner can mint tokens.');
        } else if (error.message.includes('insufficient energy')) {
            console.error('💡 Insufficient energy. Try increasing the feeLimit.');
        } else if (error.message.includes('network')) {
            console.error('💡 Network error. Check your internet connection and RPC URL.');
        } else if (error.message.includes('Cannot mint to zero address')) {
            console.error('💡 Invalid recipient address. Cannot mint to zero address.');
        } else if (error.message.includes('Amount must be greater than 0')) {
            console.error('💡 Invalid amount. Amount must be greater than 0.');
        }
    }
}

async function checkTokenInfo() {
    try {
        console.log('\n📊 Checking token information...');
        
        const tokenContract = await tronWeb.contract().at(TOKEN_ADDRESS);
        
        // Get token details
        const name = await tokenContract.name().call();
        const symbol = await tokenContract.symbol().call();
        const decimals = await tokenContract.decimals().call();
        const totalSupply = await tokenContract.totalSupply().call();
        
        console.log('📋 Token Details:');
        console.log(`   Name: ${name}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Decimals: ${decimals}`);
        console.log(`   Total Supply: ${totalSupply} (${parseInt(totalSupply) / 1e18} tokens)`);
        
        // Check current balance of recipient
        const recipientBalance = await tokenContract.balanceOf(RECIPIENT_ADDRESS).call();
        console.log(`   Recipient Balance: ${recipientBalance} (${parseInt(recipientBalance) / 1e18} tokens)`);
        
    } catch (error) {
        console.error('❌ Error checking token info:', error.message);
    }
}

async function runMintingScript() {
    try {
        // Validate environment variables
        validateEnvironment();
        
        console.log('🎯 UNITE V1 Token Minting Script (Environment-based)');
        console.log('====================================================');
        
        // Check token information first
        await checkTokenInfo();
        
        // Perform minting
        console.log('\n📝 STEP 1: Minting Tokens');
        console.log('==========================');
        await mintTokens();
        
        // Final check
        console.log('\n📊 STEP 2: Final Balance Check');
        console.log('==============================');
        await checkTokenInfo();
        
        console.log('\n🎉 Minting script completed!');
        
    } catch (error) {
        console.error('\n💥 Script failed:', error);
        console.error('Please check your environment variables and try again.');
    }
}

// Run the minting script
runMintingScript().catch((error) => {
    console.error('\n💥 Script failed:', error);
}); 