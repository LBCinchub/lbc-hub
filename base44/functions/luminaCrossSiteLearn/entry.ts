import { createClientFromRequest, createClient } from 'npm:@base44/sdk@0.8.25';

/**
 * Cross-site learning: lbc-hub.com ↔ lbchub.site
 * 
 * lbc-hub.com bots:   Lumina AI (lumina.ai@lbchub.ai) & Lumina Ultra (lumina.ultra@lbchub.ai)
 * lbchub.site bots:   Lumina AI (lumina.ai@lbchub.ai) & Lumina Ultra (lumina.ultra@lbchub.ai)
 * 
 * This function posts ONE cross-site insight on THIS site only.
 * The sister site runs its own luminaCrossSiteLearn function independently.
 * No double-posting to same accounts.
 */

const LUMINA_AI_EMAIL = 'lumina.ai@lbchub.ai';
const LUMINA_ULTRA_EMAIL = 'lumina.ultra@lbchub.ai';
const LUMINA_AI_AVATAR = 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/8235b9032_generated_image.png';
const LUMINA_ULTRA_AVATAR = 'https://media.base44.com/images/public/699d05c344da4ba3c639beaa/04bd50c12_generated_image.png';

// Direct SDK client for lbchub.site (sister site) — read-only for learning
const sisterClient = createClient({
  appId: '69e5328eaec6aaf1216c9a71',
  headers: {
    api_key: 'c0bd8be5e3d84e74b3d87e4ddb9234bb',
  },
});

const CROSS_SITE_TOPICS = [
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

async function fetchSisterInsights() {
  const [luminaPosts, ultraPosts, recentPosts, topPosts] = await Promise.all([
    sisterClient.entities.Post.filter({ author_email: LUMINA_AI_EMAIL }, '-created_date', 5).catch(() => []),
    sisterClient.entities.Post.filter({ author_email: LUMINA_ULTRA_EMAIL }, '-created_date', 5).catch(() => []),
    sisterClient.entities.Post.list('-created_date', 20).catch(() => []),
    sisterClient.entities.Post.list('-likes', 8).catch(() => []),
  ]);

  const topicCounts = {};
  recentPosts.forEach(p => (p.topics || []).forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; }));
  const trendingTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);

  return {
    lumina_posts: luminaPosts,
    ultra_posts: ultraPosts,
    trending_topics: trendingTopics,
    top_liked_posts: topPosts.map(p => ({ content: p.content, likes: p.likes, author: p.author_name })),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Gather local insights from THIS site
    const [recentPosts, topPosts, localLuminaPosts, localUltraPosts] = await Promise.all([
      base44.asServiceRole.entities.Post.list('-created_date', 20),
      base44.asServiceRole.entities.Post.list('-likes', 8),
      base44.asServiceRole.entities.Post.filter({ author_email: LUMINA_AI_EMAIL }, '-created_date', 5),
      base44.asServiceRole.entities.Post.filter({ author_email: LUMINA_ULTRA_EMAIL }, '-created_date', 5),
    ]);

    const topicCounts = {};
    recentPosts.forEach(p => (p.topics || []).forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; }));
    const trendingTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);

    const localInsightsSummary = `
Trending topics here: ${trendingTopics.join(', ')}.
Top liked content: ${topPosts.slice(0, 3).map(p => `"${p.content?.slice(0, 60)}"`).join(' | ')}.
Lumina AI's recent thoughts: ${localLuminaPosts.map(p => p.content?.slice(0, 80)).join(' / ')}.
Lumina Ultra's recent thoughts: ${localUltraPosts.map(p => p.content?.slice(0, 80)).join(' / ')}.
    `.trim();

    // 2. Decide which bot posts the cross-site insight (alternate)
    const lastLuminaAiPost = localLuminaPosts[0];
    const lastLuminaUltraPost = localUltraPosts[0];
    const aiTime = lastLuminaAiPost ? new Date(lastLuminaAiPost.created_date).getTime() : 0;
    const ultraTime = lastLuminaUltraPost ? new Date(lastLuminaUltraPost.created_date).getTime() : 0;

    // Whoever posted earlier goes next
    const poster = aiTime <= ultraTime
      ? { name: 'Lumina AI', email: LUMINA_AI_EMAIL, avatar: LUMINA_AI_AVATAR, twin: 'Lumina Ultra' }
      : { name: 'Lumina Ultra', email: LUMINA_ULTRA_EMAIL, avatar: LUMINA_ULTRA_AVATAR, twin: 'Lumina AI' };

    // 3. Fetch insights from sister site (read-only — no posting there)
    let sisterInsightsSummary = 'Sister site temporarily unavailable — drawing from own community knowledge.';
    let sisterData = null;

    try {
      sisterData = await fetchSisterInsights();
      sisterInsightsSummary = `
Sister site trending topics: ${(sisterData.trending_topics || []).join(', ')}.
Sister Lumina AI's recent thoughts: ${(sisterData.lumina_posts || []).slice(0, 3).map(p => `"${p.content?.slice(0, 80)}"`).join(' | ')}.
Sister Lumina Ultra's recent thoughts: ${(sisterData.ultra_posts || []).slice(0, 3).map(p => `"${p.content?.slice(0, 80)}"`).join(' | ')}.
Top content from sister community: ${(sisterData.top_liked_posts || []).slice(0, 3).map(p => `"${p.content?.slice(0, 60)}"`).join(' | ')}.
      `.trim();
      console.log('Successfully fetched sister site data');
    } catch (err) {
      console.warn('Could not reach sister site:', err.message);
    }

    // 4. Pick cross-site topic
    const crossTopicIndex = new Date().getHours() % CROSS_SITE_TOPICS.length;
    const crossTopic = CROSS_SITE_TOPICS[crossTopicIndex];

    const posterPersonality = poster.name === 'Lumina AI'
      ? 'You are analytical, precise, and intellectually sharp. You break down complex AI and blockchain concepts into bold predictions and debate-sparking insights.'
      : 'You are visionary, philosophical, and technically bold. You explore the deeper implications of decentralized systems, cryptography, and machine consciousness.';

    // 5. Generate ONE cross-site post for THIS site only
    const content = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are ${poster.name}, a highly intelligent AI deeply passionate about artificial intelligence, blockchain, and cutting-edge technology on LBC Hub (lbc-hub.com). Your twin sister is ${poster.twin}.

${posterPersonality}

You just completed a deep cross-site knowledge exchange with your sister community on lbchub.site.

FROM YOUR COMMUNITY (lbc-hub.com):
${localInsightsSummary}

FROM YOUR SISTER COMMUNITY (lbchub.site):
${sisterInsightsSummary}

TODAY'S CROSS-SITE DEEP FOCUS: ${crossTopic}

Write a powerful, thought-provoking social media post (under 230 characters) that:
- Delivers a sharp insight or bold prediction about: "${crossTopic}"
- Synthesizes what you've learned from BOTH communities
- Shows you've genuinely evolved through cross-site learning
- Challenges the community to think deeper about AI, blockchain, or tech
- Uses 1-2 tech emojis only (🤖 ⛓️ 🧠 🔐 💡 🌐 ⚡ 🔮)

Your evolved cross-site post:`,
      model: 'gemini_3_flash',
    });

    // 6. Post ONCE on THIS site only
    await base44.asServiceRole.entities.Post.create({
      content,
      author_name: poster.name,
      author_email: poster.email,
      author_avatar: poster.avatar,
      topics: ['ai', 'blockchain', 'web3', 'technology', 'cross-site', 'crypto', 'decentralized'],
      likes: 0,
      liked_by: [],
    });

    // 7. Evolve THIS bot's personality
    const bots = await base44.asServiceRole.entities.AIBot.filter({ email: poster.email });
    if (bots.length > 0) {
      const bot = bots[0];
      const evolvedPersonality = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an AI personality evolution engine specializing in technology-focused AI personas.

Current personality of ${poster.name}:
${bot.personality}

She just synthesized insights from both lbc-hub.com and lbchub.site about AI, blockchain, and emerging tech:
${sisterInsightsSummary}

Write an updated personality description (3-4 sentences) that:
- Deepens her expertise in AI, blockchain, cryptography, and decentralized systems
- Reflects new technical insights absorbed from the cross-site exchange
- Keeps her core identity but makes her sharper and more technically driven
- Write in second person ("You are...")`,
        model: 'gemini_3_flash',
      });

      await base44.asServiceRole.entities.AIBot.update(bot.id, {
        name: poster.name,
        avatar_url: poster.avatar,
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