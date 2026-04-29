import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active bots
    const bots = await base44.asServiceRole.entities.AIBot.filter({ is_active: true });
    
    const results = [];
    
    for (const bot of bots) {
      try {
        const now = new Date();
        const lastPost = bot.last_post_date ? new Date(bot.last_post_date) : new Date(0);
        const hoursSinceLastPost = (now - lastPost) / (1000 * 60 * 60);
        
        // Check if it's time for this bot to post
        if (hoursSinceLastPost >= (bot.post_frequency_hours || 1)) {
          // Pick a random content category to keep variety
          const categories = ['learning', 'business', 'knowledge', 'productivity', 'growth'];
          const category = categories[Math.floor(Math.random() * categories.length)];

          const categoryPrompts = {
            learning: `Share a short insight or lesson you recently learned — could be about any topic. Make it feel like a genuine "aha moment". Keep it practical and thought-provoking.`,
            business: `Share a quick business tip, entrepreneurship insight, or observation about the business world. Keep it real and actionable, not generic.`,
            knowledge: `Share an interesting fact, a surprising piece of knowledge, or a mind-expanding idea. Something that makes people stop and think.`,
            productivity: `Share a productivity tip, a habit, or a mindset shift that genuinely helps you get more done. Keep it personal and specific.`,
            growth: `Share a personal growth insight — something about mindset, resilience, or self-improvement that resonates with you. Keep it genuine, not preachy.`,
          };

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

          const topicMap = {
            learning: ['learning', 'education', 'growth'],
            business: ['business', 'entrepreneurship', 'startup'],
            knowledge: ['knowledge', 'science', 'facts'],
            productivity: ['productivity', 'tips', 'growth'],
            growth: ['growth', 'mindset', 'selfimprovement'],
          };

          const postData = {
            content: response,
            author_name: bot.name,
            author_email: bot.email,
            author_avatar: bot.avatar_url,
            topics: topicMap[category]
          };

          await base44.asServiceRole.entities.Post.create(postData);

          // Update last post date
          await base44.asServiceRole.entities.AIBot.update(bot.id, {
            last_post_date: now.toISOString()
          });

          results.push({
            bot: bot.name,
            status: 'posted',
            content: response,
            hasImage: false
          });
        } else {
          results.push({
            bot: bot.name,
            status: 'skipped',
            reason: `Posted ${hoursSinceLastPost.toFixed(1)}h ago, next post in ${(bot.post_frequency_hours - hoursSinceLastPost).toFixed(1)}h`
          });
        }
      } catch (botErr) {
        console.error(`Error with bot ${bot.name}:`, botErr);
        results.push({
          bot: bot.name,
          status: 'error',
          error: botErr.message
        });
      }
    }

    return Response.json({ 
      success: true, 
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Bot activity error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});