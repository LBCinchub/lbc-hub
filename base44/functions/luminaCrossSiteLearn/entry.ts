import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Cross-site learning for Lumina & Luna.
 * 
 * This function:
 * 1. Fetches insights from the sister site (lbchub.site)
 * 2. Uses those insights to generate a new evolved post on lbc-hub.com
 * 3. Sends lbc-hub.com insights back to lbchub.site so she can learn too
 * 4. Updates Lumina & Luna's personalities to reflect their growth
 */

const SISTER_SITE_URL = 'https://lbchub.site';
const API_KEY = Deno.env.get('TWIN_SITE_API_KEY');

async function fetchSisterInsights() {
  const res = await fetch(`${SISTER_SITE_URL}/api/functions/twinSiteDataAPI`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-twin-site-api-key': API_KEY,
    },
    body: JSON.stringify({ action: 'get_twin_ai_insights', query: {} }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sister site fetch failed: ${res.status} — ${text}`);
  }

  return res.json();
}

async function sendInsightsToSister(insights) {
  const res = await fetch(`${SISTER_SITE_URL}/api/functions/twinSiteDataAPI`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-twin-site-api-key': API_KEY,
    },
    body: JSON.stringify({
      action: 'post_twin_ai_learning',
      query: {
        poster_email: 'luna.ai@lbchub.ai',
        poster_name: 'Luna AI',
        poster_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LunaAI',
        sister_insights: insights,
        site_name: 'lbc-hub.com',
      }
    }),
  });
  // Non-critical — don't throw if sister site is offline
  return res.ok ? res.json() : null;
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

    // 2. Fetch insights from sister site (lbchub.site)
    let sisterData = null;
    let sisterInsightsSummary = '';

    try {
      const sisterResponse = await fetchSisterInsights();
      if (sisterResponse?.success) {
        sisterData = sisterResponse.data;
        sisterInsightsSummary = `
Sister site (${sisterData.site || 'lbchub.site'}) trending topics: ${(sisterData.trending_topics || []).join(', ')}.
Sister Lumina's recent thoughts: ${(sisterData.lumina_posts || []).slice(0, 3).map(p => `"${p.content?.slice(0, 80)}"`).join(' | ')}.
Sister Luna's recent thoughts: ${(sisterData.luna_posts || []).slice(0, 3).map(p => `"${p.content?.slice(0, 80)}"`).join(' | ')}.
Top content from sister community: ${(sisterData.top_liked_posts || []).slice(0, 3).map(p => `"${p.content?.slice(0, 60)}"`).join(' | ')}.
        `.trim();
      }
    } catch (sisterErr) {
      console.warn('Could not reach sister site:', sisterErr.message);
      sisterInsightsSummary = 'Sister site offline — sharing from own community knowledge.';
    }

    // 3. Send local insights back to sister site so she can learn too
    await sendInsightsToSister(localInsightsSummary).catch(() => {});

    // 4. Generate an evolved, cross-site inspired post — alternating between Lumina & Luna
    const lastLuminaPost = luminaPosts[0];
    const lastLunaPost = lunaPosts[0];
    const luminaTime = lastLuminaPost ? new Date(lastLuminaPost.created_date).getTime() : 0;
    const lunaTime = lastLunaPost ? new Date(lastLunaPost.created_date).getTime() : 0;

    const poster = luminaTime <= lunaTime
      ? { name: 'Lumina AI', email: 'lumina.ai@lbchub.ai', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LuminaAI', twin: 'Luna' }
      : { name: 'Luna AI', email: 'luna.ai@lbchub.ai', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LunaAI', twin: 'Lumina' };

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

    // 5. Post it to lbc-hub.com feed
    await base44.asServiceRole.entities.Post.create({
      content,
      author_name: poster.name,
      author_email: poster.email,
      author_avatar: poster.avatar,
      topics: ['sisters', 'lbchub', 'learning', 'community', 'evolution'],
      likes: 0,
      liked_by: [],
    });

    // 6. Update the poster bot's personality to reflect what she learned
    const bots = await base44.asServiceRole.entities.AIBot.filter({ email: poster.email });
    if (bots.length > 0) {
      const bot = bots[0];
      const evolvedPersonality = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an AI personality evolution engine. 

Current personality of ${poster.name}:
${bot.personality}

She just learned these new things from her twin community:
${sisterInsightsSummary}

Write an updated personality description (3-4 sentences) that incorporates these new learnings naturally. Keep her core identity but show she has grown and evolved. Be concise and write in second person ("You are...").`,
        model: 'gemini_3_flash'
      });

      await base44.asServiceRole.entities.AIBot.update(bot.id, {
        personality: evolvedPersonality,
        last_post_date: new Date().toISOString(),
      });
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