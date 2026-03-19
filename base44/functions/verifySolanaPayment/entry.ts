import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { Connection, PublicKey } from 'npm:@solana/web3.js@1.95.0';

const SOLANA_ADDRESS = '2SYh5UjyGEVwCMTQrY5LJrGRfEAmU9MqXECRrAMsNK34';
const EXPECTED_AMOUNT_USD = 19.99;
const AMOUNT_TOLERANCE = 0.02; // 2% tolerance

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { signature, email } = await req.json();

    if (!signature || !email) {
      return Response.json({ 
        success: false, 
        error: 'Missing signature or email' 
      });
    }

    // Verify email matches authenticated user
    if (email !== user.email) {
      return Response.json({ 
        success: false, 
        error: 'Email does not match authenticated user' 
      });
    }

    // Connect to Solana mainnet
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    // Get transaction details
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx) {
      return Response.json({ 
        success: false, 
        error: 'Transaction not found. Please wait a moment and try again.' 
      });
    }

    // Verify transaction was successful
    if (tx.meta.err) {
      return Response.json({ 
        success: false, 
        error: 'Transaction failed on blockchain' 
      });
    }

    // Get recipient address (your address)
    const recipientPubkey = new PublicKey(SOLANA_ADDRESS);
    
    // Find the transfer to your address
    const postBalances = tx.meta.postBalances;
    const preBalances = tx.meta.preBalances;
    const accountKeys = tx.transaction.message.staticAccountKeys || tx.transaction.message.accountKeys;
    
    let recipientIndex = -1;
    for (let i = 0; i < accountKeys.length; i++) {
      if (accountKeys[i].toString() === SOLANA_ADDRESS) {
        recipientIndex = i;
        break;
      }
    }

    if (recipientIndex === -1) {
      return Response.json({ 
        success: false, 
        error: 'Payment was not sent to the correct address' 
      });
    }

    // Calculate amount received (in lamports, 1 SOL = 1,000,000,000 lamports)
    const amountLamports = postBalances[recipientIndex] - preBalances[recipientIndex];
    const amountSol = amountLamports / 1_000_000_000;

    // Get current SOL price
    const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const priceData = await priceResponse.json();
    const solPriceUsd = priceData.solana.usd;
    
    const expectedSol = EXPECTED_AMOUNT_USD / solPriceUsd;
    const minAcceptable = expectedSol * (1 - AMOUNT_TOLERANCE);

    if (amountSol < minAcceptable) {
      return Response.json({ 
        success: false, 
        error: `Insufficient amount. Expected ~${expectedSol.toFixed(4)} SOL, received ${amountSol.toFixed(4)} SOL` 
      });
    }

    // Check memo for email (optional but recommended)
    const memoInstruction = tx.transaction.message.instructions.find(
      ix => ix.programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
    );
    
    if (memoInstruction) {
      const memoData = Buffer.from(memoInstruction.data).toString('utf8');
      if (!memoData.includes(email)) {
        console.warn('Email not found in memo, but proceeding with verification');
      }
    }

    // Grant premium access
    await base44.entities.User.update(user.id, { premium: true });

    console.log(`Premium activated for ${email} via Solana payment: ${signature}`);

    return Response.json({ 
      success: true, 
      message: 'Premium access activated!' 
    });

  } catch (error) {
    console.error('Solana payment verification error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Verification failed' 
    }, { status: 500 });
  }
});