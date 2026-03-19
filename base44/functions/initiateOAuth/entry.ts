import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// OAuth configuration for each platform
const OAUTH_CONFIG = {
  twitter: {
    client_id: Deno.env.get('TWITTER_CLIENT_ID'),
    auth_url: 'https://twitter.com/i/oauth2/authorize',
    scopes: ['tweet.read', 'tweet.write', 'users.read'],
  },
  linkedin: {
    client_id: Deno.env.get('LINKEDIN_CLIENT_ID'),
    auth_url: 'https://www.linkedin.com/oauth/v2/authorization',
    scopes: ['w_member_social', 'r_liteprofile'],
  },
  facebook: {
    client_id: Deno.env.get('FACEBOOK_CLIENT_ID'),
    auth_url: 'https://www.facebook.com/v18.0/dialog/oauth',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish'],
  },
  instagram: {
    client_id: Deno.env.get('FACEBOOK_CLIENT_ID'),
    auth_url: 'https://www.facebook.com/v18.0/dialog/oauth',
    scopes: ['instagram_basic', 'instagram_content_publish'],
  },
  tiktok: {
    client_id: Deno.env.get('TIKTOK_CLIENT_ID'),
    auth_url: 'https://www.tiktok.com/v2/auth/authorize',
    scopes: ['user.info.basic', 'video.upload', 'video.publish'],
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { platform, user_email } = payload;

    if (!platform || !user_email) {
      return Response.json({ error: 'Missing platform or user_email' }, { status: 400 });
    }

    const config = OAUTH_CONFIG[platform];
    if (!config?.client_id) {
      return Response.json(
        { error: `OAuth not configured for ${platform}. Admin needs to set up API credentials.` },
        { status: 501 }
      );
    }

    // Generate PKCE challenge for security
    const state = crypto.getRandomValues(new Uint8Array(32)).reduce((p, c) => p + ('0' + c.toString(16)).slice(-2), '');
    const codeChallenge = btoa(state).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Store state in session/database for verification on callback
    // In production, you'd store this with an expiry
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const redirectUri = `${appUrl}/oauth-callback`;

    const params = new URLSearchParams({
      client_id: config.client_id,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const oauth_url = `${config.auth_url}?${params}`;

    console.log(`[OAuth] Initiating ${platform} OAuth for ${user_email}`);

    return Response.json({
      success: true,
      oauth_url,
      state,
      platform,
      user_email,
    });
  } catch (error) {
    console.error('[OAuth] Initiation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});