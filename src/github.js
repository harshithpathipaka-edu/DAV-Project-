async function request(path, signal) {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Request failed with HTTP ${response.status}.`);
    error.status = response.status;
    error.rateLimited = body.rateLimited === true;
    throw error;
  }
  return body;
}

export function normalizeRepository(input) {
  const raw = input.trim();
  const match = raw.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s?#]+)\/([^/\s?#]+)/i)
    || raw.match(/^([^/\s?#]+)\/([^/\s?#]+)$/);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "");
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
  return { owner, repo, fullName: `${owner}/${repo}` };
}

export async function searchRepositories(query, sort = "stars", signal) {
  const params = new URLSearchParams({ q: query, sort });
  return request(`/api/search?${params}`, signal);
}

export async function fetchRepository(input, signal) {
  const repository = normalizeRepository(input);
  if (!repository) throw new Error("Enter a repository as owner/name or paste its GitHub URL.");
  const owner = encodeURIComponent(repository.owner);
  const repo = encodeURIComponent(repository.repo);
  return request(`/api/repos/${owner}/${repo}/analytics`, signal);
}

export async function fetchApiStatus(signal) {
  return request("/api/status", signal);
}
