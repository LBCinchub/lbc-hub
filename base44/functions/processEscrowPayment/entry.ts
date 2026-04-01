import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { productId, sellerEmail, buyerEmail, amount, txSignature, buyerWallet } = await req.json();

    if (!productId || !sellerEmail || !buyerEmail || !amount || !txSignature || !buyerWallet) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get product to verify seller
    const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
    if (!products.length) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = products[0];
    if (product.seller_email !== sellerEmail) {
      return Response.json({ error: 'Seller mismatch' }, { status: 400 });
    }

    // Create escrow transaction
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + 7); // 7 days from now

    const transaction = await base44.asServiceRole.entities.Transaction.create({
      product_id: productId,
      product_name: product.name,
      seller_email: sellerEmail,
      seller_wallet: product.seller_wallet || '',
      buyer_email: buyerEmail,
      buyer_wallet: buyerWallet,
      amount: amount,
      tx_signature: txSignature,
      status: 'escrow',
      release_date: releaseDate.toISOString()
    });

    console.log(`Escrow created: ${transaction.id}, releasing in 7 days`);

    return Response.json({
      success: true,
      transaction_id: transaction.id,
      release_date: releaseDate.toISOString(),
      message: 'Payment held in escrow. Funds release in 7 days if no dispute.'
    });
  } catch (error) {
    console.error('Escrow error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});