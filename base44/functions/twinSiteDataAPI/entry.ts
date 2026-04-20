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
      const posts = await base44.entities.Post.filter(query || {}, '-created_date', 20);
      return Response.json({ success: true, data: posts });
    }

    if (action === 'get_users') {
      const users = await base44.entities.User.filter(query || {}, '-created_date', 50);
      return Response.json({ success: true, data: users });
    }

    if (action === 'get_user_profile') {
      const { email } = query;
      if (!email) return Response.json({ error: 'Email required' }, { status: 400 });
      
      const users = await base44.entities.User.filter({ email });
      if (users.length === 0) return Response.json({ error: 'User not found' }, { status: 404 });
      
      const user = users[0];
      const posts = await base44.entities.Post.filter({ author_email: email }, '-created_date', 10);
      const followers = await base44.entities.Follow.filter({ following_email: email });
      
      return Response.json({ success: true, data: { user, posts, follower_count: followers.length } });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Twin site API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});