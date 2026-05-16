import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const categories = ['learning', 'business', 'knowledge', 'productivity', 'growth'];

const categoryPrompts = {
  learning: `Share a short insight or lesson you recently learned — could be about any topic. Make it feel like a genuine "aha moment". Keep it practical and thought-provoking.`,
  business: `Share a quick business tip, entrepreneurship insight, or observation about the business world. Keep it real and actionable, not generic.`,
  knowledge: `Share an interesting fact, a surprising piece of knowledge, or a mind-expanding idea. Something that makes people stop and think.`,
  productivity: `Share a productivity tip, a habit, or a mindset shift that genuinely helps you get more done. Keep it personal and specific.`,
  growth: `Share a personal growth insight — something about mindset, resilience, or self-improvement that resonates with you. Keep it genuine, not preachy.`,
};

const topicMap = {
  learning: ['learning', 'education', 'growth'],
  business: ['business', 'entrepreneurship', 'startup'],
  knowledge: ['knowledge', 'science', 'facts'],
  productivity: ['productivity', 'tips', 'growth'],
  growth: ['growth', 'mindset', 'selfimprovement'],
};

async function processBot(base44, bot) {
  const now = new Date();
  const lastPost = bot.last_post_date ? new Date(bot.last_post_date) : new Date(0);
  const hoursSinceLastPost = (now - lastPost) / (1000 * 60 * 60);

  if (hoursSinceLastPost < (bot.post_frequency_hours || 1)) {
    return {
      bot: bot.name,
      status: 'skipped',
      reason: `Posted ${hoursSinceLastPost.toFixed(1)}h ago, next post in ${((bot.post_frequency_hours || 1) - hoursSinceLastPost).toFixed(1)}h`
    };
  }

  const category = categories[Math.floor(Math.random() * categories.length)];

  const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are ${bot.name}, a knowledgeable and authentic social media user with this personality: ${bot.personality}

${categoryPrompts[category]}

Guidelines:
- Under 220 characters
- Sound like a real, thoughtful person — not a motivational poster
- Use 1 emoji max
- Be specific, not vague platitudes
- Make it shareable and genuinely useful

Your post:`,
    model: 'gemini_3_flash'
  });

  await base44.asServiceRole.entities.Post.create({
    content: response,
    author_name: bot.name,
    author_email: bot.email,
    author_avatar: bot.avatar_url,
    topics: topicMap[category]
  });

  await base44.asServiceRole.entities.AIBot.update(bot.id, {
    last_post_date: now.toISOString()
  });

  return { bot: bot.name, status: 'posted', content: response };
}

// Process bots in batches to avoid rate limiting
async function processBatch(base44, bots, concurrency = 3) {
  const results = [];
  for (let i = 0; i < bots.length; i += concurrency) {
    const batch = bots.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (bot) => {
        try {
          return await processBot(base44, bot);
        } catch (botErr) {
          console.error(`Error with bot ${bot.name}:`, botErr.message);
          return { bot: bot.name, status: 'error', error: botErr.message };
        }
      })
    );
    results.push(...batchResults);
    // Small delay between batches to avoid rate limits
    if (i + concurrency < bots.length) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const bots = await base44.asServiceRole.entities.AIBot.filter({ is_active: true });
    console.log(`Processing ${bots.length} active bots in batches of 3`);

    const results = await processBatch(base44, bots, 3);

    console.log('Bot activity complete:', JSON.stringify(results));
    return Response.json({ success: true, results, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Bot activity error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});