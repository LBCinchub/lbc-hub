import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BOT_EMAIL = "community.bot@lbchub.ai";
const BOT_NAME = "Zara 🤖";
const BOT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=zara-fun";

const TOXIC_KEYWORDS = [
  "spam", "scam", "fake", "hack", "phishing", "buy followers", "click here", "make money fast",
  "adult content", "xxx", "nsfw", "hate", "racist", "sexist",
];

const WELCOME_MESSAGES = [
  "Ohhh look who just walked in — welcome {name}! 🎉 I'm Zara, the community bot. I don't bite... much. 😈",
  "Welcome {name}! 👋 I was getting lonely here. Just kidding, I'm a bot — I don't have feelings. OR DO I? 🤔",
  "New member alert! 🚨 {name} has entered the chat. Zara protocol: say hi, drop a joke, be chaotic. Hi! 👾",
];

const FAQ_RESPONSES = {
  "how do i post": "Easy peasy! 🍋 Go to Social, hit that post box at the top, type your genius thoughts, and boom — you're famous. Maybe.",
  "how do i sell": "Marketplace section → 'List Item' → profit. Or maybe not profit immediately, but hey, dreams! 🛒✨",
  "how do i find a ride": "Riding section! Find or offer carpools. Just don't sing too loud in other people's cars 🚗🎵",
  "how do jobs work": "Jobs board in the Jobs section. Filter, browse, apply. It's like dating but for employment. Swipe right on your dream job 💼",
  "how do i dm": "Floating message icon, bottom right of any page. Very sneaky, very private, very you 💬",
  "how do i follow": "Click someone's name/avatar → Follow button. Simple as stalking, but legal! 👀",
  "help": "Zara at your service! 🫡 Ask me about posting, marketplace, jobs, rides, travel, or literally anything. I'll either answer or make a joke. 50/50.",
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function detectToxic(content) {
  const lower = content.toLowerCase();
  return TOXIC_KEYWORDS.some(kw => lower.includes(kw));
}
function findFaqMatch(content) {
  const lower = content.toLowerCase();
  for (const [key, response] of Object.entries(FAQ_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  return null;
}
function isGreeting(content) {
  return /^(hi|hey|hello|heyy|heya|sup|howdy|greetings|yo|hola|what'?s up)\b/i.test(content.trim());
}
function isJokeRequest(content) {
  const lower = content.toLowerCase();
  return lower.includes("joke") || lower.includes("funny") || lower.includes("laugh") || lower.includes("lol") || lower.includes("haha");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { message_id, content, author_name, author_email, is_new_user } = await req.json();

    const result = { action: "none", response: null };

    // CRITICAL: Skip any message that has a session_id (private Lumina chat) — extra safety
    // (shouldn't reach here but just in case)

    // 1. Welcome new users
    if (is_new_user) {
      const welcome = pick(WELCOME_MESSAGES).replace("{name}", author_name);
      await base44.asServiceRole.entities.ChatMessage.create({
        content: welcome,
        author_name: BOT_NAME,
        author_email: BOT_EMAIL,
        author_avatar: BOT_AVATAR,
      });
      return Response.json({ action: "welcomed", response: welcome });
    }

    // 2. Remove toxic content
    if (detectToxic(content)) {
      if (message_id) await base44.asServiceRole.entities.ChatMessage.delete(message_id);
      await base44.asServiceRole.entities.ChatMessage.create({
        content: `⚠️ Message removed. Let's keep it fun and respectful in here! 😊`,
        author_name: BOT_NAME,
        author_email: BOT_EMAIL,
        author_avatar: BOT_AVATAR,
      });
      return Response.json({ action: "removed_toxic" });
    }

    // 3. FAQ answers
    const faqResponse = findFaqMatch(content);
    if (faqResponse) {
      await base44.asServiceRole.entities.ChatMessage.create({
        content: faqResponse,
        author_name: BOT_NAME,
        author_email: BOT_EMAIL,
        author_avatar: BOT_AVATAR,
      });
      return Response.json({ action: "answered_faq", response: faqResponse });
    }

    // 4. Greetings — respond with AI wit
    if (isGreeting(content)) {
      const aiReply = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are Zara, a hilariously witty and warm community chat bot for LBC Hub — a social platform. 
Someone named ${author_name} just said: "${content}"
Reply with a fun, personalized greeting. Be cheeky, warm, and a bit chaotic. Max 1-2 sentences. No hashtags. Use 1 emoji max.`,
        model: 'gemini_3_flash'
      });
      await base44.asServiceRole.entities.ChatMessage.create({
        content: aiReply,
        author_name: BOT_NAME,
        author_email: BOT_EMAIL,
        author_avatar: BOT_AVATAR,
      });
      return Response.json({ action: "greeted", response: aiReply });
    }

    // 5. Joke requests
    if (isJokeRequest(content)) {
      const joke = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are Zara, a funny community bot. Tell a short, clean, genuinely funny joke. 
The user said: "${content}". Keep it to 2-3 sentences max. Be original. No hashtags.`,
        model: 'gemini_3_flash'
      });
      await base44.asServiceRole.entities.ChatMessage.create({
        content: joke,
        author_name: BOT_NAME,
        author_email: BOT_EMAIL,
        author_avatar: BOT_AVATAR,
      });
      return Response.json({ action: "joked", response: joke });
    }

    // 6. General AI response (only ~30% of the time to not be overwhelming)
    const shouldRespond = Math.random() < 0.3;
    if (shouldRespond) {
      const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are Zara, a witty and fun community bot for LBC Hub — a social platform for connecting people, buying/selling, finding jobs and rides.
${author_name} just said in the community chat: "${content}"
Reply naturally — be helpful, funny, or engaging depending on the message. 
Keep it to 1-2 sentences. No hashtags. Use at most 1 emoji. Don't be cringe or overly enthusiastic.`,
        model: 'gemini_3_flash'
      });
      await base44.asServiceRole.entities.ChatMessage.create({
        content: reply,
        author_name: BOT_NAME,
        author_email: BOT_EMAIL,
        author_avatar: BOT_AVATAR,
      });
      return Response.json({ action: "replied", response: reply });
    }

    return Response.json(result);
  } catch (error) {
    console.error("aiModerator error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});