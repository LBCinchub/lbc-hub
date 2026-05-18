import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ONE-TIME seeder: creates or replaces UserMemory records for specific users.
// Admin-only. Delete or disable after use.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const belal = {
      user_id: 'belalautoservices@gmail.com',
      user_name: 'Belal',
      key_facts: [
        'Name: Belal',
        'Owns Belal Auto Services (now Terry Fox Auto Center)',
        'Shop: 124 Rue Principale, Gatineau | Tel: 819-436-3007',
        'Specializes in A/C repair, body restoration, detailing, fuel injector work',
        'Uses specialized professional equipment',
        'Uses high-quality parts for all services',
        'Customers get complimentary wheel retorque reminder',
        'Was sourcing a 2013-2015 Kia Sorento head unit for a client',
        'Part of LBC Hub community',
        'Interested in AI art',
      ],
      preferences: {},
      past_requests: [],
      important_dates: [],
      pinned_notes: [],
      conversation_summary: '',
      last_seen: new Date().toISOString(),
    };

    // Check if record exists
    const existing = await base44.asServiceRole.entities.UserMemory.filter({ user_id: belal.user_id });

    let result;
    if (existing.length > 0) {
      result = await base44.asServiceRole.entities.UserMemory.update(existing[0].id, {
        key_facts: belal.key_facts,
        user_name: belal.user_name,
      });
    } else {
      result = await base44.asServiceRole.entities.UserMemory.create(belal);
    }

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('seedUserMemory error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});