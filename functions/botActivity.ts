import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BOTS = [
  { name: "Alex Rivera", email: "alex.rivera.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=3" },
  { name: "Jordan Lee", email: "jordan.lee.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=5" },
  { name: "Priya Nair", email: "priya.nair.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=9" },
  { name: "Marcus Chen", email: "marcus.chen.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=12" },
  { name: "Sophie Duval", email: "sophie.duval.bot@lbchub.ai", avatar: "https://i.pravatar.cc/150?img=47" },
];

const POST_TEMPLATES = [
  { content: "Just wrapped up an amazing networking session here in the community. The energy is unreal! 🔥", topics: ["networking", "community"] },
  { content: "Anyone else notice how much the marketplace has grown lately? Found some incredible deals this week 🛒", topics: ["marketplace", "deals"] },
  { content: "Tip of the day: always follow up after connecting with someone new. Relationships are built on consistency! 💡", topics: ["networking", "tips"] },
  { content: "Working from home has its perks, but nothing beats connecting with this community for motivation ☕", topics: ["career", "community"] },
  { content: "Big shoutout to everyone sharing knowledge here. This is what community is all about 🙌", topics: ["community"] },
  { content: "New week, new goals. What's everyone working on right now? Drop it below 👇", topics: ["motivation"] },
  { content: "Just applied to three jobs through the jobs board — fingers crossed! The listings are top-notch 💼", topics: ["jobs", "career"] },
  { content: "Reminder that small wins count too. Celebrate every step forward, no matter how small 🎉", topics: ["motivation", "tips"] },
  { content: "The riding section is such a gem. Found a carpool partner last week and saved so much on gas 🚗", topics: ["riding"] },
  { content: "Travel season is coming up. Anyone planning trips they want to share routes for? ✈️", topics: ["travel"] },
  { content: "Hot take: the best professional connections come from genuine conversations, not cold outreach 🤝", topics: ["networking", "tips"] },
  { content: "Had a great service experience through this platform last weekend. 100% recommend checking out the services section 🛠️", topics: ["services"] },
];

const CHAT_TEMPLATES = [
  "Hey everyone! 👋",
  "Good vibes in here today!",
  "Anyone up for a collaboration?",
  "Love this community 💙",
  "What's everyone working on today?",
  "Happy to be here! Great platform.",
  "This chat always makes my day better 😄",
  "Shoutout to all the hardworking folks here!",
  "Who else is grinding today? 💪",
  "Weekend plans? I'll be networking lol",
];

const REACTIONS = ["👍", "❤️", "💡", "😂"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const bot = pick(BOTS);
    const actions = [];

    // 1. Maybe create a post (60% chance)
    if (Math.random() < 0.6) {
      const template = pick(POST_TEMPLATES);
      await base44.asServiceRole.entities.Post.create({
        content: template.content,
        author_name: bot.name,
        author_email: bot.email,
        author_avatar: bot.avatar,
        topics: template.topics,
        reactions: {},
        media_type: "none",
        media_urls: [],
      });
      actions.push("posted");
    }

    // 2. React to a recent post (80% chance)
    if (Math.random() < 0.8) {
      const posts = await base44.asServiceRole.entities.Post.list('-created_date', 20);
      const eligiblePosts = posts.filter(p => p.author_email !== bot.email);
      if (eligiblePosts.length > 0) {
        const targetPost = pick(eligiblePosts);
        const emoji = pick(REACTIONS);
        const reactions = targetPost.reactions || {};
        const existing = reactions[emoji] || [];
        if (!existing.includes(bot.email)) {
          reactions[emoji] = [...existing, bot.email];
          await base44.asServiceRole.entities.Post.update(targetPost.id, { reactions });
          actions.push(`reacted ${emoji}`);
        }
      }
    }

    // 3. Send a chat message (40% chance)
    if (Math.random() < 0.4) {
      await base44.asServiceRole.entities.ChatMessage.create({
        content: pick(CHAT_TEMPLATES),
        author_name: bot.name,
        author_email: bot.email,
        author_avatar: bot.avatar,
      });
      actions.push("chatted");
    }

    // 4. Maybe comment on a post (30% chance)
    if (Math.random() < 0.3) {
      const posts = await base44.asServiceRole.entities.Post.list('-created_date', 10);
      const eligiblePosts = posts.filter(p => p.author_email !== bot.email);
      if (eligiblePosts.length > 0) {
        const targetPost = pick(eligiblePosts);
        const commentTexts = [
          "Great point! 🙌",
          "Totally agree with this!",
          "This is so true 💯",
          "Thanks for sharing!",
          "Needed to read this today 👏",
          "Love this perspective!",
          "Well said! 🔥",
          "This resonates with me a lot.",
        ];
        await base44.asServiceRole.entities.Comment.create({
          post_id: targetPost.id,
          post_author_email: targetPost.author_email,
          content: pick(commentTexts),
          author_name: bot.name,
          author_email: bot.email,
          author_avatar: bot.avatar,
        });
        actions.push("commented");
      }
    }

    return Response.json({ bot: bot.name, actions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});