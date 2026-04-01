import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Find all escrow transactions ready for release
    const transactions = await base44.asServiceRole.entities.Transaction.filter({
      status: 'escrow'
    });

    const now = new Date();
    const released = [];

    for (const tx of transactions) {
      const releaseDate = new Date(tx.release_date);
      
      if (now >= releaseDate) {
        // Mark as released
        await base44.asServiceRole.entities.Transaction.update(tx.id, {
          status: 'released'
        });

        released.push({
          id: tx.id,
          seller: tx.seller_email,
          amount: tx.amount,
          product: tx.product_name
        });

        console.log(`Funds released for transaction ${tx.id} to ${tx.seller_email}`);
      }
    }

    return Response.json({
      success: true,
      released_count: released.length,
      transactions: released
    });
  } catch (error) {
    console.error('Release error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});