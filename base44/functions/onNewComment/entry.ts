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

    // The post author to notify is stored on the comment as post_author_email
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

    const result = await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_email,
      title: `${commenterName} commented on your post`,
      body: preview,
      url: '/Social',
      type: 'comment',
      tag: `comment-${comment.post_id}`,
    });

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('onNewComment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});