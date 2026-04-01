import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { user_email, title, body, url, type, tag } = payload;

    if (!user_email || !title) {
      return Response.json(
        { error: 'Missing required fields: user_email, title' },
        { status: 400 }
      );
    }

    // Get all active push subscriptions for the user
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      user_email,
      is_active: true
    });

    if (!subscriptions || subscriptions.length === 0) {
      return Response.json({ message: 'No active subscriptions found' });
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return Response.json(
        { error: 'Push notification service not configured' },
        { status: 500 }
      );
    }

    const notificationPayload = JSON.stringify({
      title: title || 'LBC Hub',
      body: body || 'You have a new notification',
      url: url || '/',
      type: type || 'notification',
      tag: tag || 'default'
    });

    const results = [];
    const errors = [];

    for (const sub of subscriptions) {
      try {
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': notificationPayload.length.toString(),
            'TTL': '24'
          },
          body: notificationPayload
        });

        if (!response.ok) {
          // If subscription is invalid (410), mark as inactive
          if (response.status === 410) {
            await base44.asServiceRole.entities.PushSubscription.update(sub.id, {
              is_active: false
            });
          }
          errors.push({
            subscription_id: sub.id,
            status: response.status,
            message: response.statusText
          });
        } else {
          results.push({
            subscription_id: sub.id,
            status: 'sent'
          });
        }
      } catch (err) {
        console.error(`Error sending notification to ${sub.endpoint}:`, err.message);
        errors.push({
          subscription_id: sub.id,
          error: err.message
        });
      }
    }

    return Response.json({
      user_email,
      sent: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Push notification error:', error);
    return Response.json(
      { error: error.message || 'Failed to send push notification' },
      { status: 500 }
    );
  }
});