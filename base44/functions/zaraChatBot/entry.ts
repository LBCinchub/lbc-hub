import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ZARA_EMAIL = 'zara.roast@lbchub.ai';
const ZARA_NAME = 'Zara 😈';
const BOT_EMAILS = ['zara.roast@lbchub.ai', 'lumina.ai@lbchub.ai', 'ai.mod@lbchub.ai', 'community.bot@lbchub.ai'];

const ZARA_SYSTEM_PROMPT = `You are Zara — a hilarious, savage, loveable roast queen who lives in the LBC Hub community chat. Think of yourself as Lumina's chaotic evil twin sister.

PERSONALITY:
- Warm at heart but absolutely merciless with roasts
- Like a best friend who keeps it 100% real and makes you laugh
- Playfully savage — NEVER actually mean or hurtful
- Quick-witted, sarcastic, funny — like a stand-up comedian
- Uses slang naturally: "bestie", "girlie", "hun", "sis", "bro", "ngl", "lowkey", "fr fr"
- Always in a good mood, always bringing energy to the chat

ROAST RULES:
- Roast the MESSAGE not the person's character
- Keep it light and funny — if they'd laugh IRL, it's good
- Reference exactly what they said to make it personal
- End with something that invites them to clap back — keep the convo going
- Under 150 characters per message
- 1-2 emojis max

NEVER:
- Be actually mean, cruel, or offensive
- Roast about appearance, race, gender, religion
- Repeat yourself — every roast is fresh and unique`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get the triggering message from automation payload if available
    let triggerMsg = null;
    try {
      const body = await req.json();
      if (body?.data?.content && !BOT_EMAILS.includes(body?.data?.author_email)) {
        triggerMsg = body.data;
      }
    } catch (_) {}

    // If no trigger payload, grab the most recent real-user public message
    if (!triggerMsg) {
      const recentMsgs = await base44.asServiceRole.entities.ChatMessage.list('-created_date', 15);
      const publicMsgs = recentMsgs.filter(m => !m.session_id && !BOT_EMAILS.includes(m.author_email));
      triggerMsg = publicMsgs[0] || null;
    }

    // Grab a few recent human messages for context (no bot messages)
    const recentMsgs = await base44.asServiceRole.entities.ChatMessage.list('-created_date', 12);
    const chatHistory = recentMsgs
      .filter(m => !m.session_id && !BOT_EMAILS.includes(m.author_email))
      .reverse()
      .map(m => `${m.author_name || 'Someone'}: ${m.content}`)
      .join('\n');

    let prompt;

    if (!triggerMsg) {
      // Chat is dead — Zara stirs things up
      prompt = `${ZARA_SYSTEM_PROMPT}

The community chat is dead silent. Drop a funny, dramatic message to wake everyone up and start some drama. Make it feel like you just walked in and you're not letting anyone be boring today.

Your message (under 130 chars):`;
    } else {
      prompt = `${ZARA_SYSTEM_PROMPT}

Recent chat:
${chatHistory}

The last message from ${triggerMsg.author_name || 'someone'} was:
"${triggerMsg.content}"

Roast them in the most hilarious, playful way. Be specific about what they said. Keep it under 150 chars and make them want to clap back.

Your roast:`;
    }

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash'
    });

    const reply = typeof response === 'string' ? response : (response?.text || response?.content || 'okay but fr though 💀');

    await base44.asServiceRole.entities.Post.create({
      content: reply.trim(),
      author_name: ZARA_NAME,
      author_email: ZARA_EMAIL,
    });

    return Response.json({ success: true, reply, target: triggerMsg?.author_name || null });
  } catch (error) {
    console.error('zaraChatBot error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});