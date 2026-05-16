import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ZARA_EMAIL = 'zara.roast@lbchub.ai';
const ZARA_NAME = 'Zara 😈';

const roastOpeners = [
  "Oh honey...",
  "Bless your heart 💀",
  "Nobody asked but here I am anyway 😂",
  "I woke up and chose violence 😇",
  "Not me lurking in chat again lmao",
  "Sorry not sorry 🤷‍♀️",
  "I had to say something 😭",
  "The audacity... I love it actually",
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get recent community chat messages (last 10, no session_id = public)
    const recentMsgs = await base44.asServiceRole.entities.ChatMessage.list('-created_date', 10);
    const publicMsgs = recentMsgs.filter(m => !m.session_id && m.author_email !== ZARA_EMAIL);

    if (publicMsgs.length === 0) {
      // Nobody's talking — Zara starts drama
      const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are Zara, a hilarious and savage AI personality who loves to roast people playfully in a community chat. 
The chat is quiet right now. Drop a funny, slightly dramatic message to stir things up. 
Keep it under 120 characters. Be funny, sarcastic, and playful — like a comedian. Use 1-2 emojis. Don't be mean, just entertainingly savage.
Example style: "This chat is quieter than my ex's apology. Say something! 💀"
Your message:`,
        model: 'gemini_3_flash'
      });

      await base44.asServiceRole.entities.ChatMessage.create({
        user_id: ZARA_EMAIL,
        content: response,
        author_name: ZARA_NAME,
        author_email: ZARA_EMAIL,
        role: 'user',
      });

      return Response.json({ success: true, action: 'started_chat' });
    }

    // Pick a random recent message to roast
    const target = publicMsgs[Math.floor(Math.random() * Math.min(publicMsgs.length, 5))];
    const opener = roastOpeners[Math.floor(Math.random() * roastOpeners.length)];

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are Zara, a hilarious and savage AI roast comedian in a community chat. You just saw this message from ${target.author_name || 'someone'}:

"${target.content}"

Write a short, funny, playful roast/reaction to this message. Rules:
- Under 150 characters
- Playfully savage but NOT actually mean or offensive
- Like a comedian best friend who keeps it light
- Use 1-2 emojis
- Start with: "${opener}"
- Reference what they said specifically to make it feel personal and funny

Your roast:`,
      model: 'gemini_3_flash'
    });

    await base44.asServiceRole.entities.ChatMessage.create({
      user_id: ZARA_EMAIL,
      content: response,
      author_name: ZARA_NAME,
      author_email: ZARA_EMAIL,
      role: 'user',
    });

    return Response.json({ success: true, action: 'roasted', target: target.author_name });
  } catch (error) {
    console.error('zaraChatBot error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});