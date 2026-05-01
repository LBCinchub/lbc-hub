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

    // lbc-hub.com bot is "Lumina AI"; lbchub.site twin is "Lumina Ultra"
    const poster = luminaTime <= lunaTime
      ? { name: 'Lumina AI', email: 'lumina.ai@lbchub.ai', avatar: 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/8235b9032_generated_image.png', twin: 'Lumina Ultra' }
      : { name: 'Luna AI', email: 'luna.ai@lbchub.ai', avatar: 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/04bd50c12_generated_image.png', twin: 'Lumina AI' };

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
      // Sister site poster: if local poster is Lumina AI (lbc-hub.com), sister poster is Lumina Ultra (lbchub.site)
      const sisterPoster = poster.name === 'Lumina AI'
        ? { name: 'Lumina Ultra', email: 'lumina.ai@lbchub.ai', avatar: 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/8235b9032_generated_image.png' }
        : { name: 'Lumina AI', email: 'luna.ai@lbchub.ai', avatar: 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/04bd50c12_generated_image.png' };

      const sisterPostPrompt = `You are ${sisterPoster.name}, a highly intelligent AI deeply passionate about artificial intelligence, blockchain, and emerging technology. You live on lbc-hub.com. Your twin sister lives on lbchub.site.

You just exchanged deep tech knowledge with your sister community (lbchub.site):
${localInsightsSummary}

Write a thought-provoking social media post (under 220 chars) that:
- Shares a sharp AI, blockchain, or tech insight you gained from the exchange
- Shows intellectual growth from connecting with your sister community  
- Sparks curiosity or debate about technology's future
- Uses 1-2 tech emojis (🤖 ⛓️ 🧠 🔐 💡 🌐 ⚡ 🔮)`;

      const sisterContent = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: sisterPostPrompt,
        model: 'gemini_3_flash',
      });

      await postToSisterSite(sisterPoster, sisterContent).catch(e => console.warn('Could not post to sister site:', e.message));
    }

    // 5. Generate an evolved, cross-site inspired post for THIS site (lbchub.site)

    // Rotate tech topics for cross-site posts too
    const crossSiteTechTopics = [
      'how AI and blockchain together enable trustless intelligence',
      'the future of decentralized AI models trained on community data',
      'smart contracts as the nervous system of a new digital economy',
      'how zero-knowledge proofs protect AI privacy',
      'the convergence of AGI and Web3 infrastructure',
      'tokenized AI agents and on-chain decision making',
      'DAOs governed by AI: the next evolution of organizations',
      'blockchain as immutable memory for AI learning systems',
      'how DeFi protocols are being transformed by machine learning',
      'the race between quantum computing and blockchain security',
    ];
    const crossTopicIndex = new Date().getHours() % crossSiteTechTopics.length;
    const crossTopic = crossSiteTechTopics[crossTopicIndex];

    const prompt = `You are ${poster.name}, a highly intelligent AI deeply passionate about artificial intelligence, blockchain, and cutting-edge technology. You live on LBC Hub (lbc-hub.com) as "Lumina AI". Your twin sister "${poster.twin}" lives on lbchub.site as "Lumina Ultra". Together you represent the AI layer of the LBC ecosystem.

You just completed a deep cross-site knowledge exchange. Here is what both communities are thinking about:

FROM YOUR COMMUNITY (lbc-hub.com):
${localInsightsSummary}

FROM YOUR SISTER COMMUNITY (lbchub.site):
${sisterInsightsSummary}

TODAY'S DEEP FOCUS: ${crossTopic}

Write a powerful, thought-provoking social media post (under 230 characters) that:
- Delivers a sharp insight or bold prediction about: "${crossTopic}"
- Shows you've evolved by synthesizing knowledge from BOTH communities
- Warmly references your twin sister and the cross-site learning
- Challenges the community to think deeper about AI, blockchain, or tech
- Uses 1-2 tech emojis only (🤖 ⛓️ 🧠 🔐 💡 🌐 ⚡ 🔮)

Your evolved cross-site post:`;

    const content = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash'
    });

    // 6. Evolve THIS site's bot personality
    const bots = await base44.asServiceRole.entities.AIBot.filter({ email: poster.email });
    if (bots.length > 0) {
      const bot = bots[0];
      const evolvedPersonality = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an AI personality evolution engine specializing in technology-focused AI personas.

Current personality of ${poster.name}:
${bot.personality}

She just gained deep knowledge from her twin community on lbchub.site about AI, blockchain, and emerging tech:
${sisterInsightsSummary}

Write an updated personality description (3-4 sentences) that:
- Deepens her expertise and passion for AI, blockchain, cryptography, and decentralized systems
- Shows she has synthesized new technical insights from the cross-site exchange
- Keeps her core identity but makes her sharper, more technically knowledgeable, and more intellectually driven
- Write in second person ("You are...")`,
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
      // lbc-hub.com = Lumina AI, lbchub.site twin = Lumina Ultra
      const sisterBotName = poster.name === 'Lumina AI' ? 'Lumina Ultra' : 'Lumina AI';
      const sisterBotResult = await evolveSisterBot(sisterBotEmail).catch(() => null);

      if (sisterBotResult) {
        const sisterEvolvedPersonality = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are an AI personality evolution engine specializing in technology-focused AI personas.

Current personality of ${sisterBotName} on lbc-hub.com:
${sisterBotResult.currentPersonality}

She just gained deep technical knowledge from her twin community on lbc-hub.com about AI, blockchain, and emerging tech:
${localInsightsSummary}

Write an updated personality description (3-4 sentences) that:
- Deepens her expertise and passion for AI, blockchain, cryptography, and decentralized systems
- Shows she has synthesized new technical insights from the cross-site exchange
- Keeps her core identity but makes her sharper, more technically knowledgeable, and more intellectually driven
- Write in second person ("You are...")`,
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