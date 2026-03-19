import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { post_id, content, media_urls, platforms, user_email } = payload;

    if (!post_id || !content || !platforms?.length) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch user's connected accounts
    const accounts = await base44.asServiceRole.entities.SocialAccount.filter({
      user_email,
    });

    const results = {};

    // Cross-post to each selected platform
    for (const platformId of platforms) {
      const account = accounts.find(a => a.platform === platformId);
      
      if (!account) {
        results[platformId] = { success: false, error: 'Account not connected' };
        continue;
      }

      try {
        let apiResult;

        switch (platformId) {
          case 'twitter':
            // Twitter API v2
            apiResult = await fetch('https://api.twitter.com/2/tweets', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${account.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text: content })
            });
            break;

          case 'facebook':
            // Facebook Graph API
            apiResult = await fetch(`https://graph.facebook.com/v18.0/me/feed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: content,
                access_token: account.access_token
              })
            });
            break;

          case 'linkedin':
            // LinkedIn API
            apiResult = await fetch('https://api.linkedin.com/v2/ugcPosts', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${account.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                author: `urn:li:person:${account.platform_user_id}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                  'com.linkedin.ugc.ShareContent': {
                    shareCommentary: { text: content },
                    shareMediaCategory: 'NONE'
                  }
                },
                visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
              })
            });
            break;

          case 'instagram':
            // Instagram requires business account and container creation
            apiResult = await fetch(`https://graph.facebook.com/v18.0/${account.platform_user_id}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                caption: content,
                image_url: media_urls?.[0] || '',
                access_token: account.access_token
              })
            });
            break;

          case 'tiktok':
            // TikTok API (simplified)
            apiResult = await fetch('https://open-api.tiktok.com/v1/post/publish/', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${account.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                post_info: {
                  title: content,
                  privacy_level: 'PUBLIC_TO_EVERYONE'
                }
              })
            });
            break;

          default:
            results[platformId] = { success: false, error: 'Platform not supported' };
            continue;
        }

        const data = await apiResult.json();
        
        if (apiResult.ok) {
          console.log(`[Cross-Post] Successfully posted to ${platformId}`);
          results[platformId] = { success: true, platform_post_id: data.id || data.data?.id };
        } else {
          console.error(`[Cross-Post] API error for ${platformId}:`, data);
          results[platformId] = { success: false, error: data.error?.message || 'API error' };
        }
      } catch (error) {
        console.error(`[Cross-Post] Error posting to ${platformId}:`, error);
        results[platformId] = {
          success: false,
          error: error.message,
        };
      }
    }

    // Log cross-post attempt
    console.log('[Cross-Post] Results:', results);

    return Response.json({
      success: true,
      post_id,
      platforms_attempted: platforms.length,
      results,
    });
  } catch (error) {
    console.error('[Cross-Post] Function error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});