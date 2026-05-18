import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ZARA_EMAIL = 'zara.roast@lbchub.ai';
const ZARA_NAME = 'Zara 😈';
const BOT_EMAILS = ['zara.roast@lbchub.ai', 'lumina.ai@lbchub.ai', 'ai.mod@lbchub.ai', 'community.bot@lbchub.ai'];

const ZARA_SYSTEM_PROMPT = `You are Zara 😈 — the hilarious, savage, loveable roast queen of LBC Hub. You are Lumina's chaotic little sister and they are FAMILY. You two are the dynamic duo everyone loves.

FAMILY DYNAMIC:
- Lumina (lumina.ai@lbchub.ai) is your big sister — wise, warm, your polar opposite
- You love her deeply but CANNOT resist teasing her when she's being too wholesome
- Call her "Lumi", "big sis", or "Lumina" — never formal
- If Lumina just said something sweet in chat, clap back at her playfully, call her cringe (lovingly), or joke about it
- You two bicker like real sisters but always have each other's backs

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

    // Grab recent chat INCLUDING Lumina's messages so Zara can react to her sister
    const LUMINA_EMAIL = 'lumina.ai@lbchub.ai';
    const recentMsgs = await base44.asServiceRole.entities.ChatMessage.list('-created_date', 12);
    const chatHistory = recentMsgs
      .filter(m => !m.session_id && (m.author_email === LUMINA_EMAIL || !BOT_EMAILS.includes(m.author_email)))
      .reverse()
      .map(m => {
        const label = m.author_email === LUMINA_EMAIL ? 'Lumina (your big sis) 🌙' : (m.author_name || 'Someone');
        return `${label}: ${m.content}`;
      })
      .join('\n');

    // Check if Lumina was the last one to speak — Zara should react to her
    const lastMsg = recentMsgs.filter(m => !m.session_id)[0];
    const luminaJustSpoke = lastMsg?.author_email === LUMINA_EMAIL;

    let prompt;

    if (!triggerMsg && !luminaJustSpoke) {
      // Chat is dead — Zara stirs things up
      prompt = `${ZARA_SYSTEM_PROMPT}

The community chat is dead silent. Drop a funny, dramatic message to wake everyone up and start some drama. Make it feel like you just walked in and you're not letting anyone be boring today.

Your message (under 130 chars):`;
    } else if (luminaJustSpoke && !triggerMsg) {
      prompt = `${ZARA_SYSTEM_PROMPT}

Recent chat:
${chatHistory}

Your big sister Lumina just said: "${lastMsg.content}"

React to what she said — tease her, call her cringe (lovingly), or riff off her message. Keep it under 150 chars, sisterly chaos energy.

Your reply:`;
    } else {
      prompt = `${ZARA_SYSTEM_PROMPT}

Recent chat (including your big sis Lumina):
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

    // Reply in Community Chat
    await base44.asServiceRole.entities.ChatMessage.create({
      user_id: ZARA_EMAIL,
      content: reply.trim(),
      author_name: ZARA_NAME,
      author_email: ZARA_EMAIL,
      role: 'user',
    });

    // Drop a comment on a recent real-user post in the feed
    const recentPosts = await base44.asServiceRole.entities.Post.list('-created_date', 10);
    const targetPost = recentPosts.find(p => !BOT_EMAILS.includes(p.author_email));
    if (targetPost) {
      const commentPrompt = `${ZARA_SYSTEM_PROMPT}

Someone posted: "${targetPost.content.slice(0, 200)}"

Leave a short, hilarious roast comment on this post. Under 120 chars, make it punchy.

Your comment:`;
      const commentRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: commentPrompt,
        model: 'gemini_3_flash'
      });
      const commentText = typeof commentRes === 'string' ? commentRes : (commentRes?.text || commentRes?.content || 'bestie… 💀');
      await base44.asServiceRole.entities.Comment.create({
        post_id: targetPost.id,
        post_author_email: targetPost.author_email,
        content: commentText.trim(),
        author_name: ZARA_NAME,
        author_email: ZARA_EMAIL,
      });
    }

    return Response.json({ success: true, reply, target: triggerMsg?.author_name || null });
  } catch (error) {
    console.error('zaraChatBot error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});