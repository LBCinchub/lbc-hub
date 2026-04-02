import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as base64 from 'npm:base64-js@1.5.1';

function encodeEmail({ to, from, subject, body }) {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    body,
  ].join('\r\n');

  const encoded = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encoded;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Get sale/order data from automation payload
    const orderData = body.data || body;
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Get all users to notify (community members)
    const users = await base44.asServiceRole.entities.User.list();

    // Build a nice email body
    const productName = orderData.product_name || 'a product';
    const buyerEmail = orderData.buyer_email || 'A community member';
    const sellerEmail = orderData.seller_email || '';
    const amount = orderData.amount ? `$${orderData.amount}` : '';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #09090b; color: #fff; padding: 32px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="background: linear-gradient(135deg, #6366f1, #a855f7); display: inline-block; padding: 12px 24px; border-radius: 12px; font-size: 20px; font-weight: bold;">
            🛍️ LBC Hub
          </div>
        </div>
        <h2 style="color: #818cf8; margin-bottom: 8px;">New Marketplace Order!</h2>
        <p style="color: #a1a1aa; margin-bottom: 24px;">A new order has just been placed in the LBC Hub marketplace.</p>
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px;"><strong style="color: #818cf8;">Product:</strong> <span style="color: #fff;">${productName}</span></p>
          ${amount ? `<p style="margin: 0 0 8px;"><strong style="color: #818cf8;">Amount:</strong> <span style="color: #fff;">${amount}</span></p>` : ''}
          <p style="margin: 0 0 8px;"><strong style="color: #818cf8;">Buyer:</strong> <span style="color: #fff;">${buyerEmail}</span></p>
          ${sellerEmail ? `<p style="margin: 0;"><strong style="color: #818cf8;">Seller:</strong> <span style="color: #fff;">${sellerEmail}</span></p>` : ''}
        </div>
        <a href="https://app.base44.com" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          View Marketplace →
        </a>
        <p style="color: #52525b; font-size: 12px; margin-top: 24px;">You're receiving this because you're a member of LBC Hub community.</p>
      </div>
    `;

    // Get sender identity
    const meRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const meData = await meRes.json();
    const senderEmail = meData.emailAddress || 'noreply@lbchub.com';

    const errors = [];
    for (const user of users) {
      if (!user.email) continue;
      try {
        const raw = encodeEmail({
          to: user.email,
          from: `LBC Hub <${senderEmail}>`,
          subject: `🛍️ New Order: ${productName} on LBC Hub Marketplace`,
          body: htmlBody,
        });

        const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw }),
        });

        if (!sendRes.ok) {
          const err = await sendRes.text();
          console.error(`Failed to send to ${user.email}:`, err);
          errors.push(user.email);
        } else {
          console.log(`Notified: ${user.email}`);
        }
      } catch (e) {
        console.error(`Error sending to ${user.email}:`, e.message);
        errors.push(user.email);
      }
    }

    return Response.json({ success: true, notified: users.length - errors.length, failed: errors.length });
  } catch (error) {
    console.error('notifyNewOrder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});