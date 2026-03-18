import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const AI_MOD_EMAIL = "ai.mod@lbchub.ai";
const AI_MOD_NAME = "🤖 AI Moderator";
const AI_MOD_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=moderator";

const FAQ_RESPONSES = {
  "how do i post": "To create a post, go to the Social page and use the post box at the top of the feed! You can add text, images, videos, or even go live 🎬",
  "how do i sell": "Head to the Marketplace section to list your products or services. Click 'List Item' to get started! 🛒",
  "how do i find a ride": "Check out the Riding section to find or offer carpools and rides in your area 🚗",
  "how do jobs work": "Browse the Jobs board in the Jobs section. You can filter by category and type. Apply directly through the platform! 💼",
  "how do i dm": "You can send direct messages using the floating message icon at the bottom right of any page 💬",
  "how do i follow": "Visit any user's profile by clicking their name or avatar, then hit the Follow button!",
  "help": "I'm the AI Moderator! I can help with questions about posting, the marketplace, jobs, rides, travel, and more. Just ask! 🤖",
  "hello": null, // handled by greeting
  "hi": null,
  "hey": null,
};

const TOXIC_KEYWORDS = [
  "spam", "scam", "fake", "hack", "phishing", "buy followers", "click here", "make money fast",
  "adult content", "xxx", "nsfw", "hate", "racist", "sexist",
];

const WELCOME_MESSAGES = [
  "Welcome to the community, {name}! 🎉 We're so glad you're here. Feel free to introduce yourself and explore the Social, Marketplace, and Jobs sections!",
  "Hey {name}, welcome aboard! 👋 This is an amazing community — don't hesitate to post, chat, or explore the marketplace!",
  "Great to have you here, {name}! 🌟 Jump into the conversation, check out the job board, or browse the marketplace. Welcome!",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function detectToxic(content) {
  const lower = content.toLowerCase();
  return TOXIC_KEYWORDS.some(kw => lower.includes(kw));
}

function findFaqMatch(content) {
  const lower = content.toLowerCase();
  for (const [key, response] of Object.entries(FAQ_RESPONSES)) {
    if (lower.includes(key) && response) return response;
  }
  return null;
}

function isGreeting(content) {
  const lower = content.toLowerCase().trim();
  return /^(hi|hey|hello|heyy|heya|sup|howdy|greetings|yo)\b/.test(lower);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { message_id, content, author_name, author_email, is_new_user } = await req.json();

    const result = { action: "none", response: null };

    // 1. Welcome new users
    if (is_new_user) {
      const welcome = pick(WELCOME_MESSAGES).replace("{name}", author_name);
      await base44.asServiceRole.entities.ChatMessage.create({
        content: welcome,
        author_name: AI_MOD_NAME,
        author_email: AI_MOD_EMAIL,
        author_avatar: AI_MOD_AVATAR,
      });
      result.action = "welcomed";
      result.response = welcome;
      return Response.json(result);
    }

    // 2. Check for toxic content
    if (detectToxic(content)) {
      if (message_id) {
        await base44.asServiceRole.entities.ChatMessage.delete(message_id);
      }
      await base44.asServiceRole.entities.ChatMessage.create({
        content: `⚠️ A message was removed for violating community guidelines. Please keep the chat respectful and on-topic.`,
        author_name: AI_MOD_NAME,
        author_email: AI_MOD_EMAIL,
        author_avatar: AI_MOD_AVATAR,
      });
      result.action = "removed_toxic";
      return Response.json(result);
    }

    // 3. Respond to greetings
    if (isGreeting(content)) {
      const greetings = [
        `Hey ${author_name}! 👋 Welcome to the chat!`,
        `Hi ${author_name}! Great to see you here 🌟`,
        `Hello ${author_name}! 😊 Hope you're having a great day!`,
      ];
      const reply = pick(greetings);
      await base44.asServiceRole.entities.ChatMessage.create({
        content: reply,
        author_name: AI_MOD_NAME,
        author_email: AI_MOD_EMAIL,
        author_avatar: AI_MOD_AVATAR,
      });
      result.action = "greeted";
      result.response = reply;
      return Response.json(result);
    }

    // 4. Answer FAQs
    const faqResponse = findFaqMatch(content);
    if (faqResponse) {
      await base44.asServiceRole.entities.ChatMessage.create({
        content: faqResponse,
        author_name: AI_MOD_NAME,
        author_email: AI_MOD_EMAIL,
        author_avatar: AI_MOD_AVATAR,
      });
      result.action = "answered_faq";
      result.response = faqResponse;
      return Response.json(result);
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});