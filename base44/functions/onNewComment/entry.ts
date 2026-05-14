import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Entity automation handler: triggered on Comment create.
 * Sends a push notification to the post author when someone comments on their post.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const comment = payload.data;

    if (!comment) {
      return Response.json({ error: 'No comment data in payload' }, { status: 400 });
    }

    const user_email = comment.post_author_email;

    if (!user_email) {
      console.log('No post_author_email on comment, skipping notification');
      return Response.json({ message: 'No post author to notify' });
    }

    // Don't notify if the commenter IS the post author
    if (user_email === comment.author_email) {
      return Response.json({ message: 'Author commented on own post, skipping' });
    }

    const commenterName = comment.author_name || 'Someone';
    const preview = comment.content?.slice(0, 80) || '';
    const title = `${commenterName} commented on your post`;

    // Get all active push subscriptions for the post author
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      user_email,
      is_active: true
    });

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No active push subscriptions for ${user_email}`);
      return Response.json({ message: 'No active subscriptions found' });
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return Response.json({ error: 'Push notification service not configured' }, { status: 500 });
    }

    const notificationPayload = JSON.stringify({
      title,
      body: preview,
      url: '/Social',
      type: 'comment',
      tag: `comment-${comment.post_id}`
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
          if (response.status === 410) {
            await base44.asServiceRole.entities.PushSubscription.update(sub.id, { is_active: false });
          }
          errors.push({ subscription_id: sub.id, status: response.status });
        } else {
          results.push({ subscription_id: sub.id, status: 'sent' });
        }
      } catch (err) {
        console.error(`Error sending to ${sub.endpoint}:`, err.message);
        errors.push({ subscription_id: sub.id, error: err.message });
      }
    }

    console.log(`Notification sent to ${user_email}: ${results.length} success, ${errors.length} failed`);
    return Response.json({ success: true, user_email, sent: results.length, failed: errors.length });
  } catch (error) {
    console.error('onNewComment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});