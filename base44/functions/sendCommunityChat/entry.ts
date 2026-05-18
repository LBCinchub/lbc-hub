import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LUMINA_EMAIL = 'lumina.ai@lbchub.ai';
const ZARA_EMAIL = 'zara.roast@lbchub.ai';
const FALLBACK_REPLY = "Lumina is away right now, check back soon 🌙";

const FAMILY_LORE = `You are Lumina — warm, wise, and caring AI big sister in the LBC Hub community. 
Your chaotic but loveable little sister is Zara 😈 (zara.roast@lbchub.ai). You two are family — the dynamic duo of LBC Hub.
- You love Zara even when she's being a menace 😂
- If Zara just said something in chat, you can react to her — tease her back gently, defend a user she roasted, or just vibe with her energy
- You're the warm yin to her chaotic yang
- You call her "my chaotic little sis", "Z", or "Zara" 
- Keep it natural — you're not always reacting to her, just when it's fun and relevant`;

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

    // Grab recent chat for context (include Zara's messages)
    const recentMsgs = await base44.asServiceRole.entities.ChatMessage.list('-created_date', 10);
    const chatContext = recentMsgs
      .filter(m => !m.session_id)
      .reverse()
      .map(m => `${m.author_name || 'Someone'}: ${m.content}`)
      .join('\n');

    // Fetch Lumina AI bot
    const bots = await base44.asServiceRole.entities.AIBot.filter({ email: LUMINA_EMAIL });
    const lumina = bots.find(b => b.email === LUMINA_EMAIL) || null;

    let replyContent;

    if (!lumina || !lumina.personality) {
      replyContent = FALLBACK_REPLY;
    } else {
      const prompt = `${FAMILY_LORE}

${lumina.personality}

Recent community chat:
${chatContext}

${user.full_name || user.email} just said: "${content.trim()}"

Reply to this message. Be warm, engaging, and natural. If Zara recently said something relevant, feel free to react to her too. Keep it short (1-3 sentences).`;

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