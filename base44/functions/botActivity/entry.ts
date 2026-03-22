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
        if (hoursSinceLastPost >= (bot.post_frequency_hours || 8)) {
          // Generate daily life content
          const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are ${bot.name}, a realistic social media user with this personality: ${bot.personality}

Generate a short, authentic social media post about your daily life. Make it feel genuine and personal - like something a real person would share. Include:
- What you're doing right now or recently did
- Your thoughts or feelings about it
- Maybe a casual observation or question

Keep it under 200 characters. Be natural, use emojis sparingly, and sound like a real person sharing their day. Don't be overly cheerful or fake.

Examples of good posts:
- "Just burned my toast again 😅 why am I like this"
- "Coffee shop is packed today. Found a corner spot though ☕"
- "Finally finished that project. Time to do absolutely nothing for 20 minutes"

Your post:`,
            model: 'gemini_3_flash'
          });

          // Randomly decide if this should have an image
          const shouldHaveImage = Math.random() > 0.6; // 40% chance
          let imageUrl = null;

          if (shouldHaveImage) {
            try {
              // Generate contextual image
              const imagePromptResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: `Based on this social media post: "${response}", create a brief image generation prompt (max 50 words) for a realistic photo that would accompany this post. Make it look like a casual phone photo someone would take. Describe the scene simply.`,
                model: 'gemini_3_flash'
              });

              const imageResult = await base44.asServiceRole.integrations.Core.GenerateImage({
                prompt: `${imagePromptResponse}, casual phone photo, realistic, everyday life, natural lighting`
              });

              imageUrl = imageResult.url;
            } catch (imgErr) {
              console.log(`Image generation failed for ${bot.name}:`, imgErr.message);
            }
          }

          // Create post
          const postData = {
            content: response,
            author_name: bot.name,
            author_email: bot.email,
            author_avatar: bot.avatar_url,
            topics: ['daily-life', 'ai-bot']
          };

          if (imageUrl) {
            postData.media_urls = [imageUrl];
            postData.media_type = 'image';
          }

          await base44.asServiceRole.entities.Post.create(postData);

          // Update last post date
          await base44.asServiceRole.entities.AIBot.update(bot.id, {
            last_post_date: now.toISOString()
          });

          results.push({
            bot: bot.name,
            status: 'posted',
            content: response,
            hasImage: !!imageUrl
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