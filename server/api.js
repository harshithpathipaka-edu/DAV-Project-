const githubApi = "https://api.github.com";

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN?.trim();
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function githubRequest(url, { allowProcessing = false } = {}) {
  const response = await fetch(url, {
    headers: githubHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  if (allowProcessing && response.status === 202) return [];

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || `GitHub returned HTTP ${response.status}.`);
    error.status = response.status;
    error.rateLimited = response.status === 403 || response.status === 429;
    throw error;
  }
  return body;
}

function sendApiError(response, error) {
  const status = Number.isInteger(error?.status) ? error.status : 502;
  response.status(status).json({
    error: error?.name === "TimeoutError" ? "GitHub took too long to respond. Please try again." : error?.message || "GitHub request failed.",
    rateLimited: error?.rateLimited === true,
  });
}

function methodNotAllowed(response) {
  response.setHeader("Allow", "GET");
  return response.status(405).json({ error: "Method not allowed." });
}

function statusHandler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response);
  response.json({ tokenConfigured: Boolean(process.env.GITHUB_TOKEN?.trim()) });
}

async function searchHandler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response);
  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
  const sort = typeof request.query.sort === "string" ? request.query.sort : "stars";
  if (query.length < 2 || query.length > 200) {
    response.status(400).json({ error: "Search text must be between 2 and 200 characters." });
    return;
  }
  if (!["stars", "updated", "help-wanted-issues"].includes(sort)) {
    response.status(400).json({ error: "Choose a supported repository sort." });
    return;
  }

  try {
    const params = new URLSearchParams({ q: `${query} is:public`, sort, order: "desc", per_page: "24" });
    const results = await githubRequest(`${githubApi}/search/repositories?${params}`);
    response.json({ totalCount: results.total_count, items: results.items || [] });
  } catch (error) {
    sendApiError(response, error);
  }
}

async function repositoryAnalyticsHandler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response);
  const owner = request.params?.owner ?? request.query.owner;
  const repo = request.params?.repo ?? request.query.repo;
  if (typeof owner !== "string" || typeof repo !== "string"
    || !/^[\w.-]{1,100}$/.test(owner) || !/^[\w.-]{1,100}$/.test(repo)
    || owner === "." || owner === ".." || repo === "." || repo === "..") {
    response.status(400).json({ error: "Repository name is invalid." });
    return;
  }

  const base = `${githubApi}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const repository = await githubRequest(base);
    if (repository.private) {
      response.status(403).json({ error: "Private repository analytics are not exposed by this dashboard. Only public repository data is available." });
      return;
    }

    const [commits, pulls, issues, languages, punchCard] = await Promise.all([
      githubRequest(`${base}/commits?per_page=100&since=${encodeURIComponent(since)}`),
      githubRequest(`${base}/pulls?state=all&sort=created&direction=desc&per_page=100`),
      githubRequest(`${base}/issues?state=all&sort=created&direction=desc&per_page=100`),
      githubRequest(`${base}/languages`),
      githubRequest(`${base}/stats/punch_card`, { allowProcessing: true }),
    ]);

    if (!Array.isArray(commits) || !Array.isArray(pulls) || !Array.isArray(issues) || !Array.isArray(punchCard)) {
      response.status(502).json({ error: "GitHub returned an incomplete analytics response. Try again shortly." });
      return;
    }

    response.json({
      repo: repository,
      commits,
      pulls,
      issues: issues.filter((issue) => !issue.pull_request),
      languages,
      punchCard,
    });
  } catch (error) {
    sendApiError(response, error);
  }
}

export { repositoryAnalyticsHandler, searchHandler, statusHandler };
