import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { platform, username, password, accessToken } = payload;

    if (!platform || !username) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // In a real implementation, you would:
    // 1. Validate credentials with the platform's API
    // 2. Exchange credentials for an access token if needed
    // 3. Encrypt sensitive data before storage

    // For now, we'll simulate a connection with a mock token
    const mockToken = accessToken || `mock_${platform}_token_${Date.now()}`;

    // Check if account already exists
    const existing = await base44.entities.SocialAccount.filter({
      user_email: user.email,
      platform: platform
    });

    let accountId;
    if (existing.length > 0) {
      // Update existing
      await base44.entities.SocialAccount.update(existing[0].id, {
        account_name: username,
        access_token: mockToken,
        platform_user_id: username
      });
      accountId = existing[0].id;
    } else {
      // Create new
      const newAccount = await base44.entities.SocialAccount.create({
        user_email: user.email,
        platform: platform,
        account_name: username,
        access_token: mockToken,
        platform_user_id: username
      });
      accountId = newAccount.id;
    }

    console.log(`[Social Connect] ${user.email} connected ${platform} as @${username}`);

    return Response.json({
      success: true,
      account_id: accountId,
      platform: platform,
      username: username
    });
  } catch (error) {
    console.error('[Social Connect] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});