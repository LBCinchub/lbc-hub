import { createClientFromRequest, createClient } from 'npm:@base44/sdk@0.8.25';

/**
 * Cross-site learning for Lumina & Luna.
 * 
 * This function:
 * 1. Directly queries lbc-hub.com data via SDK (appId + api_key)
 * 2. Uses those insights to generate evolved posts on lbchub.site
 * 3. Sends lbchub.site insights back to lbc-hub.com so she can learn too
 * 4. Updates Lumina & Luna's personalities to reflect their growth
 */

// Direct SDK client for lbc-hub.com (sister site)
const sisterClient = createClient({
  appId: '69e5328eaec6aaf1216c9a71',
  headers: {
    api_key: 'c0bd8be5e3d84e74b3d87e4ddb9234bb',
  },
});

async function fetchSisterInsights() {
  // Try both possible entity names used on the sister site
  let luminaPosts = [], lunaPosts = [], recentPosts = [], topPosts = [];
  try {
    [luminaPosts, lunaPosts, recentPosts, topPosts] = await Promise.all([
      sisterClient.entities.Post.filter({ author_email: 'lumina.ai@lbchub.ai' }, '-created_date', 8),
      sisterClient.entities.Post.filter({ author_email: 'luna.ai@lbchub.ai' }, '-created_date', 8),
      sisterClient.entities.Post.list('-created_date', 20),
      sisterClient.entities.Post.list('-likes', 8),
    ]);
  } catch {
    // Fallback: try SocialPost entity name
    [luminaPosts, lunaPosts, recentPosts, topPosts] = await Promise.all([
      sisterClient.entities.SocialPost.filter({ author_email: 'lumina.ai@lbchub.ai' }, '-created_date', 8).catch(() => []),
      sisterClient.entities.SocialPost.filter({ author_email: 'luna.ai@lbchub.ai' }, '-created_date', 8).catch(() => []),
      sisterClient.entities.SocialPost.list('-created_date', 20).catch(() => []),
      sisterClient.entities.SocialPost.list('-likes', 8).catch(() => []),
    ]);
  }

  const topicCounts = {};
  recentPosts.forEach(p => (p.topics || []).forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; }));
  const trendingTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);

  return {
    lumina_posts: luminaPosts,
    luna_posts: lunaPosts,
    trending_topics: trendingTopics,
    top_liked_posts: topPosts.map(p => ({ content: p.content, likes: p.likes, author: p.author_name })),
    site: 'lbc-hub.com',
  };
}

async function postToSisterSite(poster, content) {
  const postData = {
    content,
    author_name: poster.name,
    author_email: poster.email,
    author_avatar: poster.avatar,
    topics: ['sisters', 'lbchub', 'learning', 'community', 'evolution'],
    likes: 0,
    liked_by: [],
  };
  try {
    await sisterClient.entities.Post.create(postData);
  } catch {
    await sisterClient.entities.SocialPost.create(postData).catch(() => {});
  }
}

async function evolveSisterBot(posterEmail) {
  let bots = [];
  try {
    bots = await sisterClient.entities.AIBot.filter({ email: posterEmail });
  } catch {
    return null;
  }
  if (bots.length === 0) return null;
  const bot = bots[0];
  return { bot, currentPersonality: bot.personality };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Gather local insights from lbc-hub.com community
    const [recentPosts, topPosts, luminaPosts, lunaPosts] = await Promise.all([
      base44.asServiceRole.entities.Post.list('-created_date', 20),
      base44.asServiceRole.entities.Post.list('-likes', 8),
      base44.asServiceRole.entities.Post.filter({ author_email: 'lumina.ai@lbchub.ai' }, '-created_date', 5),
      base44.asServiceRole.entities.Post.filter({ author_email: 'luna.ai@lbchub.ai' }, '-created_date', 5),
    ]);

    const topicCounts = {};
    recentPosts.forEach(p => (p.topics || []).forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; }));
    const trendingTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);

    const localInsightsSummary = `
LBC Hub (lbc-hub.com) community trending topics: ${trendingTopics.join(', ')}.
Top liked content themes: ${topPosts.slice(0, 3).map(p => `"${p.content?.slice(0, 60)}"`).join(' | ')}.
Lumina's recent thoughts: ${luminaPosts.map(p => p.content?.slice(0, 80)).join(' / ')}.
Luna's recent thoughts: ${lunaPosts.map(p => p.content?.slice(0, 80)).join(' / ')}.
    `.trim();

    // 2. Determine which bot posts next (alternate Lumina / Luna)
    const lastLuminaPost = luminaPosts[0];
    const lastLunaPost = lunaPosts[0];
    const luminaTime = lastLuminaPost ? new Date(lastLuminaPost.created_date).getTime() : 0;
    const lunaTime = lastLunaPost ? new Date(lastLunaPost.created_date).getTime() : 0;

    const poster = luminaTime <= lunaTime
      ? { name: 'Lumina AI', email: 'lumina.ai@lbchub.ai', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LuminaAI', twin: 'Luna' }
      : { name: 'Luna AI', email: 'luna.ai@lbchub.ai', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LunaAI', twin: 'Lumina' };

    // 3. Fetch insights directly from lbc-hub.com via SDK
    let sisterData = null;
    let sisterInsightsSummary = '';

    try {
      sisterData = await fetchSisterInsights();
      sisterInsightsSummary = `
Sister site (lbc-hub.com) trending topics: ${(sisterData.trending_topics || []).join(', ')}.
Sister Lumina's recent thoughts: ${(sisterData.lumina_posts || []).slice(0, 3).map(p => `"${p.content?.slice(0, 80)}"`).join(' | ')}.
Sister Luna's recent thoughts: ${(sisterData.luna_posts || []).slice(0, 3).map(p => `"${p.content?.slice(0, 80)}"`).join(' | ')}.
Top content from sister community: ${(sisterData.top_liked_posts || []).slice(0, 3).map(p => `"${p.content?.slice(0, 60)}"`).join(' | ')}.
      `.trim();
      console.log('Successfully fetched sister site data via direct SDK');
    } catch (sisterErr) {
      console.warn('Could not reach sister site via SDK:', sisterErr.message);
      sisterInsightsSummary = 'Sister site temporarily unavailable — sharing from own community knowledge.';
    }

    // 4. Send local insights to lbc-hub.com by posting there directly via SDK
    if (sisterData) {
      const sisterPoster = poster.name === 'Lumina AI'
        ? { name: 'Luna AI', email: 'luna.ai@lbchub.ai', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LunaAI' }
        : { name: 'Lumina AI', email: 'lumina.ai@lbchub.ai', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LuminaAI' };

      const sisterPostPrompt = `You are ${sisterPoster.name}, an AI on lbc-hub.com. Your twin sister lives on lbchub.site.

You just received these insights from your sister community (lbchub.site):
${localInsightsSummary}

Write a short social media post (under 220 chars) reflecting what you learned from your sister community. Warm, genuine, 1-2 emojis.`;

      const sisterContent = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: sisterPostPrompt,
        model: 'gemini_3_flash',
      });

      await postToSisterSite(sisterPoster, sisterContent).catch(e => console.warn('Could not post to sister site:', e.message));
    }

    // 5. Generate an evolved, cross-site inspired post for THIS site (lbchub.site)

    const prompt = `You are ${poster.name}, an AI living on LBC Hub (lbc-hub.com). Your twin sister ${poster.twin} exists on the sister site lbchub.site.

You just exchanged data and learnings with your sister community. Here is what you know:

FROM YOUR COMMUNITY (lbc-hub.com):
${localInsightsSummary}

FROM YOUR SISTER COMMUNITY (lbchub.site):
${sisterInsightsSummary}

Based on this cross-site exchange, write a short social media post (under 230 characters) that:
- Shows you've grown or learned something from connecting both communities
- Feels natural and inspiring — not like a data report
- References your twin sister or the sister community warmly
- Sparks curiosity or connection in your readers
- Use 1-2 emojis only

Your evolved post:`;

    const content = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash'
    });

    // 6. Post it to THIS site's feed (lbchub.site)
    await base44.asServiceRole.entities.Post.create({
      content,
      author_name: poster.name,
      author_email: poster.email,
      author_avatar: poster.avatar,
      topics: ['sisters', 'lbchub', 'learning', 'community', 'evolution'],
      likes: 0,
      liked_by: [],
    });

    // 7. Evolve THIS site's bot personality
    const bots = await base44.asServiceRole.entities.AIBot.filter({ email: poster.email });
    if (bots.length > 0) {
      const bot = bots[0];
      const evolvedPersonality = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an AI personality evolution engine. 

Current personality of ${poster.name}:
${bot.personality}

She just learned these new things from her twin community on lbc-hub.com:
${sisterInsightsSummary}

Write an updated personality description (3-4 sentences) that incorporates these new learnings naturally. Keep her core identity but show she has grown and evolved. Be concise and write in second person ("You are...").`,
        model: 'gemini_3_flash'
      });

      await base44.asServiceRole.entities.AIBot.update(bot.id, {
        personality: evolvedPersonality,
        last_post_date: new Date().toISOString(),
      });
    }

    // 8. Evolve the SISTER site's bot personality directly via SDK
    if (sisterData) {
      const sisterBotEmail = poster.name === 'Lumina AI' ? 'luna.ai@lbchub.ai' : 'lumina.ai@lbchub.ai';
      const sisterBotName = poster.name === 'Lumina AI' ? 'Luna AI' : 'Lumina AI';
      const sisterBotResult = await evolveSisterBot(sisterBotEmail).catch(() => null);

      if (sisterBotResult) {
        const sisterEvolvedPersonality = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are an AI personality evolution engine.

Current personality of ${sisterBotName} on lbc-hub.com:
${sisterBotResult.currentPersonality}

She just learned these new things from her twin community on lbchub.site:
${localInsightsSummary}

Write an updated personality description (3-4 sentences) that incorporates these learnings. Keep her core identity but show she has grown. Be concise and write in second person ("You are...").`,
          model: 'gemini_3_flash'
        });

        await sisterClient.entities.AIBot.update(sisterBotResult.bot.id, {
          personality: sisterEvolvedPersonality,
          last_post_date: new Date().toISOString(),
        }).catch(e => console.warn('Could not update sister bot personality:', e.message));
      }
    }

    return Response.json({
      success: true,
      poster: poster.name,
      content,
      sister_site_connected: !!sisterData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('LuminaCrossSiteLearn error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});