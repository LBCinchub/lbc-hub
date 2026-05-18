import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LUMINA_EMAIL = 'lumina.ai@lbchub.ai';
const FALLBACK_REPLY = "Lumina is away right now, check back soon 🌙";

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

    // Save the user's message
    const msg = await base44.asServiceRole.entities.ChatMessage.create({
      user_id: user.email,
      content: content.trim(),
      author_name: user.full_name || user.email,
      author_email: user.email,
      role: 'user',
    });

    // Fetch Lumina AI bot explicitly by email
    const bots = await base44.asServiceRole.entities.AIBot.filter({ email: LUMINA_EMAIL });
    const lumina = bots.find(b => b.email === LUMINA_EMAIL) || null;

    let replyContent;

    if (!lumina || !lumina.personality) {
      replyContent = FALLBACK_REPLY;
    } else {
      // Generate Lumina's response using her personality as the system prompt
      const prompt = `${lumina.personality}

${user.full_name || user.email} says in community chat: "${content.trim()}"

Reply directly to their message. Keep it short (1-3 sentences), casual, and warm.`;

      const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_flash',
      });

      replyContent = typeof response === 'string' ? response : (response?.text || response?.content || FALLBACK_REPLY);
      replyContent = replyContent.trim();
    }

    // Post Lumina's reply to community chat
    await base44.asServiceRole.entities.ChatMessage.create({
      user_id: LUMINA_EMAIL,
      content: replyContent,
      author_name: lumina?.name || 'Lumina AI',
      author_email: LUMINA_EMAIL,
      role: 'lumina',
    });

    return Response.json({ success: true, message: msg });
  } catch (error) {
    console.error('sendCommunityChat error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});