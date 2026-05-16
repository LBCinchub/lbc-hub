import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await req.json();
    if (!content?.trim()) {
      return Response.json({ error: 'Empty message' }, { status: 400 });
    }

    const msg = await base44.asServiceRole.entities.ChatMessage.create({
      content: content.trim(),
      author_name: user.full_name || user.email,
      author_email: user.email,
    });

    // Fire-and-forget AI moderator
    base44.asServiceRole.functions.invoke('aiModerator', {
      message_id: msg.id,
      content: content.trim(),
      author_name: user.full_name || user.email,
      author_email: user.email,
      is_new_user: false,
    }).catch(() => {});

    return Response.json({ success: true, message: msg });
  } catch (error) {
    console.error('sendCommunityChat error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});