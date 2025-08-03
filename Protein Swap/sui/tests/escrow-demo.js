require('dotenv').config();
const { Ed25519Keypair } = require('@mysten/sui.js');
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { TransactionBlock } = require('@mysten/sui.js/transactions');
const bech32 = require('bech32');
const { keccak_256 } = require('js-sha3');
const crypto = require('crypto');

// --- CONFIGURATION FROM ENV ---
const PACKAGE_ID = process.env.PACKAGE_ID;
const MODULE = 'escrow';
const TOKEN_TYPE = `${process.env.PACKAGE_ID}::unite_v1::UNITE_V1`;
const REGISTRY_ID = process.env.ESCROW_REGISTRY_ID;
const CLOCK_ID = '0x6'; // Sui system clock object
const TIMELOCK_MS = process.env.TIMELOCK_MS || '60000'; // 60 seconds timelock for demo
const DESIRED_AMOUNT = parseInt(process.env.DESIRED_AMOUNT) || 1000000000; // Only escrow 10 tokens

// Private keys from env
const CREATOR_PRIV = process.env.CREATOR_PRIVATE_KEY;
const TAKER_PRIV = process.env.TAKER_PRIVATE_KEY;
const TAKER_ADDRESS = process.env.TAKER_ADDRESS;

// Generate random order ID and secret
const ORDER_ID = crypto.randomBytes(8).toString('hex');
const SECRET = crypto.randomBytes(16).toString('hex');
const HASH_FN = 'keccak256'; // Sui uses keccak256

// Validate required environment variables
if (!PACKAGE_ID) {
  console.error('Error: PACKAGE_ID is required in .env file');
  process.exit(1);
}

if (!REGISTRY_ID) {
  console.error('Error: ESCROW_REGISTRY_ID is required in .env file');
  process.exit(1);
}

if (!CREATOR_PRIV) {
  console.error('Error: CREATOR_PRIVATE_KEY is required in .env file');
  process.exit(1);
}

if (!TAKER_PRIV) {
  console.error('Error: TAKER_PRIVATE_KEY is required in .env file');
  process.exit(1);
}

if (!TAKER_ADDRESS) {
  console.error('Error: TAKER_ADDRESS is required in .env file');
  process.exit(1);
}

// --- UTILS ---
function decodeSuiBech32PrivateKey(privkey) {
  const { words } = bech32.bech32.decode(privkey);
  const data = Buffer.from(bech32.bech32.fromWords(words));
  return data.slice(1, 33);
}

function keccak256(input) {
  // input should be a Buffer or string
  return Buffer.from(keccak_256.arrayBuffer(input));
}

async function getFirstCoinOfType(client, address, type) {
  const coins = await client.getCoins({ owner: address, coinType: type });
  if (!coins.data.length) throw new Error('No coins of type found');
  return coins.data[0].coinObjectId;
}

async function findEscrowStorageFromTx(client, txDigest, packageId) {
  try {
    // Wait a bit for transaction to be processed
    await new Promise(res => setTimeout(res, 3000));
    
    // Get transaction details with full content
    const txDetails = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showEvents: true,
        showInput: true,
        showRawInput: false,
        showObjectChanges: true,
      },
    });

    console.log('Transaction details:', JSON.stringify(txDetails, null, 2));

    // Look for EscrowStorage in object changes
    if (txDetails.objectChanges) {
      for (const change of txDetails.objectChanges) {
        if (change.type === 'created' && change.objectType) {
          console.log('Created object type:', change.objectType);
          if (change.objectType.includes('EscrowStorage')) {
            console.log('Found EscrowStorage:', change.objectId);
            return change.objectId;
          }
        }
      }
    }

    // Fallback: Look in effects.created
    if (txDetails.effects?.created) {
      for (const obj of txDetails.effects.created) {
        const objDetails = await client.getObject({
          id: obj.reference.objectId,
          options: { showType: true }
        });
        console.log('Created object details:', objDetails);
        if (objDetails.data?.type?.includes('EscrowStorage')) {
          return obj.reference.objectId;
        }
      }
    }

    // If still not found, get all objects owned by the package (shared objects)
    console.log('Searching for shared EscrowStorage objects...');
    
    // Alternative: Search by events
    if (txDetails.events) {
      for (const event of txDetails.events) {
        console.log('Event:', event);
        if (event.type.includes('EscrowCreated')) {
          // The EscrowStorage object should be in the same transaction
          // Let's try to find it by searching all created objects
          break;
        }
      }
    }

    throw new Error('EscrowStorage object not found in transaction');
  } catch (error) {
    console.error('Error finding EscrowStorage:', error);
    throw error;
  }
}

// --- MAIN LOGIC ---
(async () => {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });

  console.log('🔄 Starting Atomic Swap Demo...');
  console.log('Package ID:', PACKAGE_ID);
  console.log('Registry ID:', REGISTRY_ID);
  console.log('Order ID:', ORDER_ID);
  console.log('Secret:', SECRET);
  console.log('Taker Address:', TAKER_ADDRESS);
  console.log('Desired Amount:', DESIRED_AMOUNT);
  console.log('---');

  // 1. Creator splits a coin to get exactly 10 tokens
  const creatorKeypair = Ed25519Keypair.fromSecretKey(decodeSuiBech32PrivateKey(CREATOR_PRIV));
  const creatorAddress = creatorKeypair.getPublicKey().toSuiAddress();
  console.log('Creator address:', creatorAddress);
  
  const coinId = await getFirstCoinOfType(client, creatorAddress, TOKEN_TYPE);
  console.log('Using coin:', coinId);
  
  // Split coin to get a coin of value 10
  const splitTx = new TransactionBlock();
  const [splitCoin] = splitTx.splitCoins(
    splitTx.object(coinId),
    [splitTx.pure(DESIRED_AMOUNT.toString())]
  );
  splitTx.transferObjects([splitCoin], splitTx.pure(creatorAddress));
  
  const splitResult = await client.signAndExecuteTransactionBlock({
    signer: creatorKeypair,
    transactionBlock: splitTx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });
  console.log('Split result digest:', splitResult.digest);

  // Find the new coin object with value 10 (retry up to 10 times)
  let tenCoin = null;
  for (let i = 0; i < 10; i++) {
    console.log(`Attempt ${i + 1} to find split coin...`);
    const coinsAfter = await client.getCoins({ owner: creatorAddress, coinType: TOKEN_TYPE });
    tenCoin = coinsAfter.data.find(c => Number(c.balance) === DESIRED_AMOUNT);
    if (tenCoin) {
      console.log('Found split coin:', tenCoin.coinObjectId);
      break;
    }
    await new Promise(res => setTimeout(res, 2000)); // wait 2 seconds before retry
  }
  if (!tenCoin) throw new Error('Could not find split coin of value 10');

  // 2. Creator creates escrow with the 10-token coin
  const secretHash = keccak256(Buffer.from(SECRET));
  console.log('Secret hash:', Array.from(secretHash));
  
  const tx1 = new TransactionBlock();
  tx1.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::create_escrow`,
    typeArguments: [TOKEN_TYPE],
    arguments: [
      tx1.object(REGISTRY_ID),
      tx1.pure(ORDER_ID),
      tx1.pure(Array.from(secretHash)),
      tx1.pure(TAKER_ADDRESS),
      tx1.object(tenCoin.coinObjectId),
      tx1.pure(TIMELOCK_MS),
      tx1.object(CLOCK_ID),
    ],
  });
  
  const result1 = await client.signAndExecuteTransactionBlock({ 
    signer: creatorKeypair, 
    transactionBlock: tx1,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });
  console.log('✅ Escrow created, digest:', result1.digest);
  console.log('Explorer Link: https://testnet.suivision.xyz/txblock/' + result1.digest + '?network=testnet');

  // Find the EscrowStorage object using the improved method
  const escrowStorageId = await findEscrowStorageFromTx(client, result1.digest, PACKAGE_ID);
  console.log('Found EscrowStorage ID:', escrowStorageId);

  // 3. Wait 5 seconds before revealing
  console.log('⏳ Waiting 5 seconds before revealing secret...');
  await new Promise(res => setTimeout(res, 5000));

  // 4. Taker reveals secret to unlock escrow
  const takerKeypair = Ed25519Keypair.fromSecretKey(decodeSuiBech32PrivateKey(TAKER_PRIV));
  const takerAddress = takerKeypair.getPublicKey().toSuiAddress();
  console.log('Taker address:', takerAddress);
  
  const tx2 = new TransactionBlock();
  tx2.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::reveal_secret`,
    typeArguments: [TOKEN_TYPE],
    arguments: [
      tx2.object(REGISTRY_ID),
      tx2.object(escrowStorageId),
      tx2.pure(ORDER_ID),
      tx2.pure(creatorAddress),
      tx2.pure(Array.from(Buffer.from(SECRET))),
      tx2.object(CLOCK_ID),
    ],
  });
  
  const result2 = await client.signAndExecuteTransactionBlock({ 
    signer: takerKeypair, 
    transactionBlock: tx2,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });
  console.log('✅ Escrow unlocked, digest:', result2.digest);
  console.log('Explorer Link: https://testnet.suivision.xyz/txblock/' + result2.digest + '?network=testnet');
  
  // Verify the taker received the tokens
  console.log('🔍 Checking taker balance...');
  const takerCoins = await client.getCoins({ owner: TAKER_ADDRESS, coinType: TOKEN_TYPE });
  console.log('Taker coins:', takerCoins.data.map(c => ({ id: c.coinObjectId, balance: c.balance })));
  
  console.log('🎉 Atomic swap completed successfully!');
  console.log('---');
  console.log('Summary:');
  console.log('- Order ID:', ORDER_ID);
  console.log('- Secret:', SECRET);
  console.log('- Creator:', creatorAddress);
  console.log('- Taker:', takerAddress);
  console.log('- Amount:', DESIRED_AMOUNT);
})().catch(console.error); 