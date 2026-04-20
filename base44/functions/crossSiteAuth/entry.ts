import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate cross-site session token
    const token = crypto.getRandomValues(new Uint8Array(32));
    const tokenHex = Array.from(token).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Store session mapping in a shared table (CrossSiteSession)
    const sessionData = await base44.entities.CrossSiteSession.create({
      user_email: user.email,
      token: tokenHex,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });

    return Response.json({
      success: true,
      token: tokenHex,
      user: {
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      },
      // URLs for cross-site login
      twin_login_url: `https://lbchub.site/auth/cross-site?token=${tokenHex}`,
    });
  } catch (error) {
    console.error('Cross-site auth error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});