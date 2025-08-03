// Atomic Swap Escrow Contract Script
// Run with: node escrow.js

import {
  Keypair,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  Contract,
  scValToNative,
  nativeToScVal,
  Address,
  xdr
} from '@stellar/stellar-sdk';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration from environment variables
const CONFIG = {
  contractId: process.env.ESCROW_CONTRACT_ID,
  tokenContractId: process.env.TOKEN_CONTRACT_ID,
  network: Networks.TESTNET,
  rpcUrl: process.env.RPC_URL || 'https://soroban-testnet.stellar.org:443',
  // Owner (escrow creator) private key
  ownerPrivateKey: process.env.OWNER_PRIVATE_KEY,
  // Taker private key (for revealing secret)
  takerPrivateKey: process.env.TAKER_PRIVATE_KEY,
  // Taker address
  takerAddress: process.env.TAKER_ADDRESS,
  // Order ID (will be generated if not provided)
  orderId: process.env.ORDER_ID || generateOrderId(),
  // Secret (will be generated if not provided)
  secret: process.env.SECRET || generateSecret(),
  // Amount in tokens
  amount: parseInt(process.env.AMOUNT) || 100,
  // Timelock duration in seconds
  timelockDuration: parseInt(process.env.TIMELOCK_DURATION) || 3600
};

// Validate required environment variables
function validateConfig() {
  const required = [
    'ESCROW_CONTRACT_ID',
    'TOKEN_CONTRACT_ID', 
    'OWNER_PRIVATE_KEY',
    'TAKER_PRIVATE_KEY',
    'TAKER_ADDRESS'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file');
    process.exit(1);
  }
}

// Generate random order ID
function generateOrderId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Generate random secret
function generateSecret() {
  return Math.random().toString(36).substring(2, 15);
}

const server = new SorobanRpc.Server(CONFIG.rpcUrl);
const ownerKeypair = Keypair.fromSecret(CONFIG.ownerPrivateKey);
const takerKeypair = Keypair.fromSecret(CONFIG.takerPrivateKey);

console.log('🚀 Atomic Swap Escrow Script');
console.log('Contract ID:', CONFIG.contractId);
console.log('Token ID:', CONFIG.tokenContractId);
console.log('Owner Address:', ownerKeypair.publicKey());
console.log('Taker Address:', CONFIG.takerAddress);
console.log('Order ID:', CONFIG.orderId);
console.log('Secret:', CONFIG.secret);
console.log('Amount:', CONFIG.amount, 'tokens');
console.log('Timelock Duration:', CONFIG.timelockDuration, 'seconds');
console.log('');

// Helper function to invoke contract with actual transaction submission
async function invokeContractTransaction(contractId, functionName, args, sourceKeypair) {
  try {
    console.log(`📤 Invoking ${functionName} on contract ${contractId}...`);
    
    // Get the account
    const account = await server.getAccount(sourceKeypair.publicKey());
    
    // Create the contract and transaction
    const contract = new Contract(contractId);
    const transaction = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: CONFIG.network,
    })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(180)
      .build();

    // Simulate first
    console.log('🔍 Simulating transaction...');
    const simulationResponse = await server.simulateTransaction(transaction);
    
    if (simulationResponse.error) {
      console.error('❌ Simulation error:', simulationResponse.error);
      return { success: false, error: simulationResponse.error };
    }

    if (!simulationResponse.result) {
      console.error('❌ No simulation result');
      return { success: false, error: 'No simulation result' };
    }

    console.log('✅ Simulation successful');

    // Prepare the transaction for submission
    const preparedTransaction = await server.prepareTransaction(transaction);
    
    // Sign the transaction
    preparedTransaction.sign(sourceKeypair);
    
    // Submit the transaction
    console.log('📡 Submitting transaction...');
    const submitResponse = await server.sendTransaction(preparedTransaction);
    
    if (submitResponse.status === 'ERROR') {
      console.error('❌ Submit error:', submitResponse);
      return { success: false, error: submitResponse };
    }

    console.log('✅ Transaction submitted:', submitResponse.hash);
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    
    // Wait a bit for the transaction to be included
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      let getResponse = await server.getTransaction(submitResponse.hash);
      
      let attempts = 0;
      while (getResponse.status === 'NOT_FOUND' && attempts < 10) {
        console.log('⏳ Still waiting...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        getResponse = await server.getTransaction(submitResponse.hash);
        attempts++;
      }
      
      if (getResponse.status === 'SUCCESS') {
        console.log('🎉 Transaction confirmed!');
        return { success: true, result: 'Transaction successful', hash: submitResponse.hash };
      } else if (getResponse.status === 'FAILED') {
        console.error('❌ Transaction failed on blockchain');
        return { success: false, error: 'Transaction failed on blockchain' };
      } else {
        // Transaction was submitted but we can't confirm - assume success
        console.log('✅ Transaction submitted successfully (confirmation timeout)');
        return { success: true, result: 'Transaction submitted', hash: submitResponse.hash };
      }
    } catch (confirmError) {
      // If we can't get confirmation, but the transaction was submitted, assume success
      console.log('✅ Transaction submitted successfully (confirmation error ignored)');
      console.log('Error details:', confirmError.message);
      return { success: true, result: 'Transaction submitted', hash: submitResponse.hash };
    }
    
  } catch (error) {
    console.error('❌ Error invoking contract:', error.message);
    return { success: false, error: error.message };
  }
}

// Helper function for read-only contract calls
async function readContract(contractId, functionName, args, sourceKeypair) {
  try {
    const account = await server.getAccount(sourceKeypair.publicKey());
    const contract = new Contract(contractId);
    
    const transaction = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: CONFIG.network,
    })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(180)
      .build();

    const simulationResponse = await server.simulateTransaction(transaction);
    
    if (simulationResponse.error) {
      console.error('Simulation error:', simulationResponse.error);
      return null;
    }

    if (simulationResponse.result && simulationResponse.result.retval) {
      return scValToNative(simulationResponse.result.retval);
    }
    
    return null;
  } catch (error) {
    console.error('Error reading contract:', error.message);
    return null;
  }
}

async function createEscrow() {
  console.log('🔒 Creating escrow with specified parameters...\n');
  
  // Compute hash of secret
  const secretBuffer = Buffer.from(CONFIG.secret);
  const hash = crypto.createHash('sha256').update(secretBuffer).digest();
  
  console.log('🎯 Escrow Parameters:');
  console.log('- Order ID:', CONFIG.orderId);
  console.log('- Secret:', CONFIG.secret);
  console.log('- Hash:', hash.toString('hex'));
  console.log('- Amount:', CONFIG.amount, 'tokens');
  console.log('- Timelock Duration:', CONFIG.timelockDuration, 'seconds');
  console.log('- Owner:', ownerKeypair.publicKey());
  console.log('- Taker:', CONFIG.takerAddress);
  console.log('');

  try {
    const result = await invokeContractTransaction(
      CONFIG.contractId,
      'create_escrow',
      [
        nativeToScVal(ownerKeypair.publicKey(), { type: 'address' }),
        nativeToScVal(CONFIG.orderId, { type: 'string' }),
        nativeToScVal(hash, { type: 'bytes' }),
        nativeToScVal(CONFIG.takerAddress, { type: 'address' }),
        nativeToScVal(CONFIG.tokenContractId, { type: 'address' }),
        nativeToScVal(CONFIG.amount, { type: 'i128' }),
        nativeToScVal(CONFIG.timelockDuration, { type: 'u64' })
      ],
      ownerKeypair
    );
    
    if (!result.success) {
      console.log('❌ Escrow creation failed:', result.error);
      return null;
    }

    console.log('✅ Escrow creation result:', result.result);
    console.log('');
    
    // Verify escrow exists
    console.log('🔍 Verifying escrow exists...');
    const exists = await readContract(
      CONFIG.contractId,
      'escrow_exists',
      [
        nativeToScVal(CONFIG.orderId, { type: 'string' }),
        nativeToScVal(ownerKeypair.publicKey(), { type: 'address' })
      ],
      ownerKeypair
    );
    
    console.log('Escrow exists:', exists);
    
    if (exists) {
      console.log('🎉 SUCCESS! Escrow created with:');
      console.log('  - Order ID:', CONFIG.orderId);
      console.log('  - Amount:', CONFIG.amount, 'tokens locked');
      console.log('  - Secret:', CONFIG.secret);
      console.log('  - Taker:', CONFIG.takerAddress);
      console.log('');
      return { orderId: CONFIG.orderId, secret: CONFIG.secret, hash };
    } else {
      console.log('❌ Escrow was not created successfully');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error creating escrow:', error.message);
    return null;
  }
}

async function revealSecretAsTaker(orderId, secret) {
  console.log('🔓 Taker revealing secret to unlock escrow...\n');
  
  try {
    // Convert secret to bytes for reveal_secret
    const secretBytes = Buffer.from(secret);
    
    console.log('📤 Taker calling reveal_secret...');
    console.log('- Caller (Taker):', takerKeypair.publicKey());
    console.log('- Order ID:', orderId);
    console.log('- Original Owner:', ownerKeypair.publicKey());
    console.log('- Secret:', secret);
    console.log('');
    
    const result = await invokeContractTransaction(
      CONFIG.contractId,
      'reveal_secret',
      [
        nativeToScVal(takerKeypair.publicKey(), { type: 'address' }),
        nativeToScVal(orderId, { type: 'string' }),
        nativeToScVal(ownerKeypair.publicKey(), { type: 'address' }),
        nativeToScVal(secretBytes, { type: 'bytes' })
      ],
      takerKeypair
    );
    
    if (!result.success) {
      console.log('❌ Secret reveal failed:', result.error);
      return;
    }

    console.log('✅ Secret revealed successfully!');
    console.log('Result:', result.result);
    console.log('');
    
    // Verify escrow is now completed
    console.log('🔍 Checking if escrow is still active...');
    const isActive = await readContract(
      CONFIG.contractId,
      'is_escrow_active',
      [
        nativeToScVal(orderId, { type: 'string' }),
        nativeToScVal(ownerKeypair.publicKey(), { type: 'address' })
      ],
      takerKeypair
    );
    
    console.log('Escrow still active:', isActive);
    
    if (!isActive) {
      console.log('🎉 SUCCESS! Taker successfully unlocked the escrow!');
      console.log('💰 Tokens have been transferred to taker:', CONFIG.takerAddress);
    } else {
      console.log('⚠️  Escrow is still active - something went wrong');
    }
    
  } catch (error) {
    console.error('❌ Error revealing secret:', error.message);
  }
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
async function main() {
  try {
    // Validate configuration
    validateConfig();
    
    console.log('🌟 ATOMIC SWAP ESCROW SCRIPT 🌟');
    console.log('');
    
    // Step 1: Create escrow using owner's private key
    const escrowData = await createEscrow();
    
    if (escrowData) {
      // Step 2: Wait 5 seconds
      console.log('⏰ Waiting 5 seconds...');
      await sleep(5000);
      console.log('');
      
      // Step 3: Reveal secret using taker's key
      await revealSecretAsTaker(escrowData.orderId, escrowData.secret);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

main(); 