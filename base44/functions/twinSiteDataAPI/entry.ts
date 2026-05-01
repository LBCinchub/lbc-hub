import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    // Validate API key from lbchub.site
    const apiKey = req.headers.get('x-twin-site-api-key') || 
                   req.headers.get('authorization')?.replace('Bearer ', '');
    
    const validKey = Deno.env.get('TWIN_SITE_API_KEY');
    
    if (!apiKey || !validKey || apiKey !== validKey) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const { action, query } = await req.json();

    // Handle different data requests from twin site
    if (action === 'get_posts') {
      const posts = await base44.asServiceRole.entities.Post.filter(query || {}, '-created_date', 20);
      return Response.json({ success: true, data: posts });
    }

    if (action === 'get_users') {
      const users = await base44.asServiceRole.entities.User.filter(query || {}, '-created_date', 50);
      return Response.json({ success: true, data: users });
    }

    if (action === 'get_user_profile') {
      const { email } = query;
      if (!email) return Response.json({ error: 'Email required' }, { status: 400 });
      
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users.length === 0) return Response.json({ error: 'User not found' }, { status: 404 });
      
      const user = users[0];
      const posts = await base44.asServiceRole.entities.Post.filter({ author_email: email }, '-created_date', 10);
      const followers = await base44.asServiceRole.entities.Follow.filter({ following_email: email });
      
      return Response.json({ success: true, data: { user, posts, follower_count: followers.length } });
    }

    // ── Twin AI learning endpoints ──────────────────────────────────────────

    // Return Lumina/Luna's recent posts and community insights for the sister site to learn from
    if (action === 'get_twin_ai_insights') {
      const [luminaPosts, lunaPosts, recentPosts, topPosts] = await Promise.all([
        base44.asServiceRole.entities.Post.filter({ author_email: 'lumina.ai@lbchub.ai' }, '-created_date', 10),
        base44.asServiceRole.entities.Post.filter({ author_email: 'luna.ai@lbchub.ai' }, '-created_date', 10),
        base44.asServiceRole.entities.Post.list('-created_date', 20),
        base44.asServiceRole.entities.Post.list('-likes', 10),
      ]);

      // Summarize community trending topics
      const topicCounts = {};
      recentPosts.forEach(p => (p.topics || []).forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; }));
      const trendingTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);

      return Response.json({
        success: true,
        data: {
          lumina_posts: luminaPosts,
          luna_posts: lunaPosts,
          trending_topics: trendingTopics,
          top_liked_posts: topPosts.map(p => ({ content: p.content, likes: p.likes, author: p.author_name })),
          site: 'lbc-hub.com',
          timestamp: new Date().toISOString(),
        }
      });
    }

    // Receive insights from sister site and post a cross-site inspired message
    if (action === 'post_twin_ai_learning') {
      const { poster_email, poster_name, poster_avatar, sister_insights, site_name } = query;
      if (!poster_email || !sister_insights) {
        return Response.json({ error: 'poster_email and sister_insights required' }, { status: 400 });
      }

      const prompt = `You are ${poster_name}, an AI on LBC Hub (lbc-hub.com). Your twin sister site is ${site_name}.
Your sister AI just shared these insights and learnings from their community:

${sister_insights}

Write a short social media post (under 220 chars) that:
- Reflects what you just learned from your sister site
- Shares it naturally with the LBC Hub community
- Mentions connecting with your sister community
- Feels warm, genuine, and inspiring
- Use 1-2 emojis

Your post:`;

      const content = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_flash',
      });

      await base44.asServiceRole.entities.Post.create({
        content,
        author_name: poster_name,
        author_email: poster_email,
        author_avatar: poster_avatar || '',
        topics: ['sisters', 'community', 'learning', 'ideas'],
        likes: 0,
        liked_by: [],
      });

      return Response.json({ success: true, post_content: content });
    }

    // Health-check / ping
    if (action === 'ping') {
      return Response.json({ success: true, site: 'lbc-hub.com', status: 'online', timestamp: new Date().toISOString() });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Twin site API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});