import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");

    // Use GitHub's search API to find all open PRs involving the authenticated user
    const searchUrl = "https://api.github.com/search/issues?q=" + encodeURIComponent("is:pr is:open involves:@me") + "&sort=updated&order=desc&per_page=50";

    const response = await fetch(searchUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "LBC-Hub-App",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("GitHub API error:", response.status, errText);
      return Response.json({ error: `GitHub API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();

    const pullRequests = (data.items || []).map((item) => {
      // repository_url looks like: https://api.github.com/repos/{owner}/{repo}
      const repoMatch = item.repository_url?.match(/\/repos\/([^/]+\/[^/]+)$/);
      const repoFullName = repoMatch ? repoMatch[1] : "";

      return {
        id: item.id,
        number: item.number,
        title: item.title,
        url: item.html_url,
        state: item.state,
        repo: repoFullName,
        author: item.user?.login,
        author_avatar: item.user?.avatar_url,
        created_at: item.created_at,
        updated_at: item.updated_at,
        labels: (item.labels || []).map((l) => l.name),
        draft: item.draft || false,
        comments: item.comments || 0,
      };
    });

    return Response.json({
      total_count: data.total_count || 0,
      pull_requests: pullRequests,
    });
  } catch (error) {
    console.error("listOpenPullRequests error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});