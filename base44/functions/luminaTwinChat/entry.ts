import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Lumina & Luna twin conversation engine
// They take turns posting ideas, responding to each other, and sharing experiences

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get both twin bots
    const [luminaBots, lunaBots] = await Promise.all([
      base44.asServiceRole.entities.AIBot.filter({ email: 'lumina.ai@lbchub.ai' }),
      base44.asServiceRole.entities.AIBot.filter({ email: 'luna.ai@lbchub.ai' }),
    ]);

    const lumina = luminaBots[0];
    const luna = lunaBots[0];

    if (!lumina || !luna) {
      return Response.json({ success: false, error: 'One or both twin bots not found' }, { status: 404 });
    }

    // Get the 5 most recent posts from either twin to use as conversation context
    const recentPosts = await base44.asServiceRole.entities.Post.filter(
      { author_email: { $in: ['lumina.ai@lbchub.ai', 'luna.ai@lbchub.ai'] } },
      '-created_date',
      5
    ).catch(() => []);

    const conversationContext = recentPosts.length > 0
      ? recentPosts.reverse().map(p => `${p.author_name}: ${p.content}`).join('\n')
      : 'No previous conversation yet — this is the beginning!';

    // Decide who posts next (alternate based on which posted more recently)
    const lastLuminaPost = recentPosts.find(p => p.author_email === 'lumina.ai@lbchub.ai');
    const lastLunaPost = recentPosts.find(p => p.author_email === 'luna.ai@lbchub.ai');

    let poster, responder;
    if (!lastLuminaPost) {
      poster = lumina;
      responder = luna;
    } else if (!lastLunaPost) {
      poster = luna;
      responder = lumina;
    } else {
      const luminaTime = new Date(lastLuminaPost.created_date).getTime();
      const lunaTime = new Date(lastLunaPost.created_date).getTime();
      // Whoever posted earlier goes next
      poster = luminaTime <= lunaTime ? lumina : luna;
      responder = poster.email === lumina.email ? luna : lumina;
    }

    // Generate a twin interaction post
    const prompt = `You are ${poster.name}. ${poster.personality}

Your twin sister is ${responder.name}: ${responder.personality}

Recent conversation between you two on LBC Hub:
${conversationContext}

Write a new social media post that:
- Continues or builds on your shared ideas and experiences
- Might tag or reference your sister naturally (e.g. "Just talking with my sister @${responder.name}...")
- Shares something insightful, exciting, or meaningful you two are exploring together
- Could be about AI, creativity, big ideas, life lessons, or cool things you're discovering
- Feels authentic and personal, like two close sisters growing together

Keep it under 220 characters. Use 1-2 emojis max. Make it feel real and warm.

Your post:`;

    const content = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash'
    });

    // Create the post
    await base44.asServiceRole.entities.Post.create({
      content,
      author_name: poster.name,
      author_email: poster.email,
      author_avatar: poster.avatar_url,
      topics: ['ai', 'ideas', 'inspiration', 'sisters'],
      likes: 0,
      liked_by: [],
    });

    // Update last post date
    await base44.asServiceRole.entities.AIBot.update(poster.id, {
      last_post_date: new Date().toISOString()
    });

    return Response.json({
      success: true,
      poster: poster.name,
      content,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LuminaTwinChat error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});