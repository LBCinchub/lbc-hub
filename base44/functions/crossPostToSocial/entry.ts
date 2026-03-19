import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createHmac } from 'node:crypto';

// OAuth 1.0a signature generation for Twitter
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret = '') {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  return createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

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
            // Twitter API v2 with OAuth 1.0a
            const twitterUrl = 'https://api.twitter.com/2/tweets';
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const nonce = Math.random().toString(36).substring(2, 15);
            
            const oauthParams = {
              oauth_consumer_key: Deno.env.get('TWITTER_CONSUMER_KEY'),
              oauth_nonce: nonce,
              oauth_signature_method: 'HMAC-SHA1',
              oauth_timestamp: timestamp,
              oauth_token: account.access_token || '',
              oauth_version: '1.0'
            };
            
            const signature = generateOAuthSignature(
              'POST',
              twitterUrl,
              oauthParams,
              Deno.env.get('TWITTER_CONSUMER_SECRET'),
              account.refresh_token || ''
            );
            
            oauthParams.oauth_signature = signature;
            
            const authHeader = 'OAuth ' + Object.keys(oauthParams)
              .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
              .join(', ');
            
            apiResult = await fetch(twitterUrl, {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
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