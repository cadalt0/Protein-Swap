require('dotenv').config();
const { Ed25519Keypair } = require('@mysten/sui.js');
const bech32 = require('bech32');
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { TransactionBlock } = require('@mysten/sui.js/transactions');

// --- CONFIGURE THESE FROM .ENV ---
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PACKAGE_ID = process.env.PACKAGE_ID;
const MODULE = 'unite_v1';
const FUNCTION = 'public_mint_to';
const TREASURY_OBJECT = process.env.TREASURY_OBJECT;
const DEFAULT_AMOUNT = process.env.DEFAULT_AMOUNT || '10000000000000000';
const DEFAULT_RECIPIENT = process.env.DEFAULT_RECIPIENT;

// Validate required environment variables
if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY is required in .env file');
  process.exit(1);
}

if (!PACKAGE_ID) {
  console.error('Error: PACKAGE_ID is required in .env file');
  process.exit(1);
}

if (!TREASURY_OBJECT) {
  console.error('Error: TREASURY_OBJECT is required in .env file');
  process.exit(1);
}

if (!DEFAULT_RECIPIENT) {
  console.error('Error: DEFAULT_RECIPIENT is required in .env file');
  process.exit(1);
}

// --- SETUP SUI CLIENT ---
const client = new SuiClient({ url: getFullnodeUrl('testnet') }); // Change to testnet/devnet if needed

// --- DECODE PRIVATE KEY ---
function decodeSuiBech32PrivateKey(privkey) {
  const { words } = bech32.bech32.decode(privkey);
  const data = Buffer.from(bech32.bech32.fromWords(words));
  return data.slice(1, 33);
}

const secretKey = decodeSuiBech32PrivateKey(PRIVATE_KEY);
const keypair = Ed25519Keypair.fromSecretKey(secretKey);

// --- Get amount and recipient from command line args if provided ---
const amount = process.argv[2] || DEFAULT_AMOUNT;
const recipient = process.argv[3] || DEFAULT_RECIPIENT;

async function main() {
  try {
    console.log('🪙 Minting tokens...');
    console.log('Package ID:', PACKAGE_ID);
    console.log('Treasury Object:', TREASURY_OBJECT);
    console.log('Amount:', amount);
    console.log('Recipient:', recipient);
    console.log('---');
    
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE}::${FUNCTION}`,
      arguments: [
        tx.object(TREASURY_OBJECT),
        tx.pure(amount),
        tx.pure(recipient),
      ],
    });
    
    const result = await client.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
    });
    
    console.log('✅ Mint successful!');
    console.log('Transaction Digest:', result.digest);
    console.log('Status:', result.effects?.status?.status || 'Success');
    console.log('Explorer Link: https://testnet.suivision.xyz/txblock/' + result.digest + '?network=testnet');
    console.log('---');
  } catch (err) {
    console.error('❌ Error executing mint:', err);
  }
}

main(); 