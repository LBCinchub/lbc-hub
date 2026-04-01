import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { transactionId, reason } = await req.json();

    if (!transactionId || !reason) {
      return Response.json({ error: 'Missing transaction ID or reason' }, { status: 400 });
    }

    // Get transaction
    const transactions = await base44.asServiceRole.entities.Transaction.filter({ id: transactionId });
    if (!transactions.length) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const transaction = transactions[0];

    // Only allow disputes within 7 days
    const releaseDate = new Date(transaction.release_date);
    if (new Date() > releaseDate) {
      return Response.json({ error: 'Dispute period expired' }, { status: 400 });
    }

    // Update to disputed status
    await base44.asServiceRole.entities.Transaction.update(transactionId, {
      status: 'disputed',
      dispute_reason: reason
    });

    console.log(`Dispute filed for transaction ${transactionId}: ${reason}`);

    return Response.json({
      success: true,
      message: 'Dispute filed. Platform team will review within 48 hours.'
    });
  } catch (error) {
    console.error('Dispute error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});