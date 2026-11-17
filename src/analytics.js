const DAY = 24 * 60 * 60 * 1000;

export const PERIODS = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
  "1Y": 365,
};

const demoAuthors = [
  { login: "gaearon", commits: 126, merged: 18, avatar: "https://avatars.githubusercontent.com/u/810438?v=4" },
  { login: "acdlite", commits: 94, merged: 14, avatar: "https://avatars.githubusercontent.com/u/3624098?v=4" },
  { login: "bvaughn", commits: 72, merged: 11, avatar: "https://avatars.githubusercontent.com/u/29597?v=4" },
  { login: "sebmarkbage", commits: 58, merged: 9, avatar: "https://avatars.githubusercontent.com/u/63648?v=4" },
  { login: "sophiebits", commits: 43, merged: 7, avatar: "https://avatars.githubusercontent.com/u/6820?v=4" },
  { login: "eps1lon", commits: 31, merged: 5, avatar: "https://avatars.githubusercontent.com/u/20332620?v=4" },
];

function daysAgo(days, hour = 12) {
  const date = new Date(Date.now() - days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

const demoCommits = Array.from({ length: 424 }, (_, index) => {
  const author = demoAuthors[index % demoAuthors.length];
  const day = (index * 7 + Math.floor(index / 4) * 3) % 365;
  return {
    sha: `demo${String(index).padStart(36, "0")}`,
    html_url: "https://github.com/facebook/react/commit",
    commit: {
      author: { name: author.login, date: daysAgo(day, (index * 5) % 24) },
      message: `Update ${["reconciler", "server rendering", "docs", "types", "test suite"][index % 5]}`,
    },
    author: { login: author.login, avatar_url: author.avatar },
  };
});

export const demoRepository = {
  full_name: "facebook/react",
  html_url: "https://github.com/facebook/react",
  description: "The library for web and native user interfaces.",
  stargazers_count: 238_400,
  forks_count: 49_300,
  open_issues_count: 1_247,
  default_branch: "main",
  owner: { avatar_url: "https://avatars.githubusercontent.com/u/69631?v=4" },
};

export const demoData = {
  repo: demoRepository,
  commits: demoCommits,
  pulls: [
    { number: 31420, title: "Improve server component streaming boundaries", user: { login: "sophiebits" }, created_at: daysAgo(2), merged_at: null, html_url: "https://github.com/facebook/react/pull/31420", state: "open", draft: false },
    { number: 31412, title: "Add support for async context propagation", user: { login: "acdlite" }, created_at: daysAgo(4), merged_at: null, html_url: "https://github.com/facebook/react/pull/31412", state: "open", draft: false },
    { number: 31398, title: "Fix hydration warning in nested boundaries", user: { login: "eps1lon" }, created_at: daysAgo(8), merged_at: null, html_url: "https://github.com/facebook/react/pull/31398", state: "open", draft: true },
    { number: 31387, title: "Refactor passive effect scheduling", user: { login: "bvaughn" }, created_at: daysAgo(11), merged_at: null, html_url: "https://github.com/facebook/react/pull/31387", state: "open", draft: false },
    { number: 31361, title: "Update reconciler fixtures for new transition", user: { login: "gaearon" }, created_at: daysAgo(15), merged_at: null, html_url: "https://github.com/facebook/react/pull/31361", state: "open", draft: false },
    { number: 31302, title: "Ship the latest compiler diagnostics", user: { login: "acdlite" }, created_at: daysAgo(18), merged_at: daysAgo(2), html_url: "https://github.com/facebook/react/pull/31302", state: "closed", draft: false },
    { number: 31264, title: "Document Suspense transition patterns", user: { login: "gaearon" }, created_at: daysAgo(21), merged_at: daysAgo(3), html_url: "https://github.com/facebook/react/pull/31264", state: "closed", draft: false },
  ],
  issues: [
    { number: 30001, title: "Unexpected fallback during selective hydration", user: { login: "devuser1" }, created_at: daysAgo(42), closed_at: null, html_url: "https://github.com/facebook/react/issues/30001", state: "open", labels: [{ name: "Bug" }] },
    { number: 30002, title: "Document the new cache invalidation behavior", user: { login: "devuser2" }, created_at: daysAgo(35), closed_at: null, html_url: "https://github.com/facebook/react/issues/30002", state: "open", labels: [{ name: "Documentation" }] },
    { number: 30003, title: "DevTools does not preserve selected component", user: { login: "devuser3" }, created_at: daysAgo(27), closed_at: null, html_url: "https://github.com/facebook/react/issues/30003", state: "open", labels: [{ name: "React DevTools" }] },
    { number: 30004, title: "Add an example for optimistic updates", user: { login: "devuser4" }, created_at: daysAgo(22), closed_at: null, html_url: "https://github.com/facebook/react/issues/30004", state: "open", labels: [{ name: "Enhancement" }] },
    { number: 30005, title: "Clarify effect cleanup ordering in Strict Mode", user: { login: "devuser5" }, created_at: daysAgo(13), closed_at: null, html_url: "https://github.com/facebook/react/issues/30005", state: "open", labels: [{ name: "Needs triage" }] },
    { number: 30006, title: "Inconsistent type for server action result", user: { login: "devuser6" }, created_at: daysAgo(7), closed_at: null, html_url: "https://github.com/facebook/react/issues/30006", state: "open", labels: [{ name: "TypeScript" }] },
    { number: 30007, title: "Transition callback runs after unmount", user: { login: "devuser7" }, created_at: daysAgo(4), closed_at: null, html_url: "https://github.com/facebook/react/issues/30007", state: "open", labels: [{ name: "Bug" }] },
    { number: 30008, title: "Support custom element property names", user: { login: "devuser8" }, created_at: daysAgo(2), closed_at: null, html_url: "https://github.com/facebook/react/issues/30008", state: "open", labels: [{ name: "Enhancement" }] },
    { number: 29950, title: "Fix a regression in batched state updates", user: { login: "devuser9" }, created_at: daysAgo(18), closed_at: daysAgo(5), html_url: "https://github.com/facebook/react/issues/29950", state: "closed", labels: [{ name: "Bug" }] },
  ],
  languages: { JavaScript: 4_105_000, TypeScript: 1_355_000, "C++": 465_000, Flow: 318_000, Shell: 82_000 },
  punchCard: Array.from({ length: 168 }, (_, index) => {
    const day = Math.floor(index / 24);
    const hour = index % 24;
    const officeHours = hour >= 9 && hour <= 17;
    const weekday = day >= 1 && day <= 5;
    const count = weekday && officeHours ? Math.floor(2 + ((day * 5 + hour * 3) % 12)) : ((day + hour) % 5 === 0 ? 1 : 0);
    return [day, hour, count];
  }),
};

function within(date, start, end = Date.now()) {
  const time = new Date(date).getTime();
  return Number.isFinite(time) && time >= start && time <= end;
}

function weekStart(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function formatWeek(date, periodDays) {
  return new Intl.DateTimeFormat("en", periodDays <= 30 ? { month: "short", day: "numeric" } : { month: "short", day: "numeric" }).format(date);
}

function selectedByContributor(item, contributor) {
  return contributor === "all" || item.author?.login === contributor || item.user?.login === contributor;
}

function averageMergeDays(pulls, start, contributor) {
  const merged = pulls.filter((pull) => pull.merged_at && within(pull.merged_at, start) && selectedByContributor(pull, contributor));
  if (!merged.length) return null;
  return merged.reduce((sum, pull) => sum + (new Date(pull.merged_at) - new Date(pull.created_at)) / DAY, 0) / merged.length;
}

export function aggregateRepository(data, period, contributor = "all") {
  const now = Date.now();
  const start = now - PERIODS[period] * DAY;
  const previousStart = start - PERIODS[period] * DAY;
  const filteredCommits = data.commits.filter((commit) => within(commit.commit.author.date, start) && selectedByContributor(commit, contributor));
  const previousCommits = data.commits.filter((commit) => within(commit.commit.author.date, previousStart, start) && selectedByContributor(commit, contributor));
  const visibleIssues = data.issues.filter((issue) => selectedByContributor(issue, contributor));
  const visiblePulls = data.pulls.filter((pull) => selectedByContributor(pull, contributor));

  const weeks = new Map();
  for (let offset = PERIODS[period] - 1; offset >= 0; offset -= 1) {
    const date = weekStart(now - offset * DAY);
    const key = date.toISOString().slice(0, 10);
    weeks.set(key, { key, week: formatWeek(date, PERIODS[period]), commits: 0, opened: 0, closed: 0 });
  }

  for (const commit of filteredCommits) {
    const key = weekStart(new Date(commit.commit.author.date)).toISOString().slice(0, 10);
    if (weeks.has(key)) weeks.get(key).commits += 1;
  }
  for (const issue of visibleIssues) {
    if (within(issue.created_at, start)) {
      const key = weekStart(new Date(issue.created_at)).toISOString().slice(0, 10);
      if (weeks.has(key)) weeks.get(key).opened += 1;
    }
    if (issue.closed_at && within(issue.closed_at, start)) {
      const key = weekStart(new Date(issue.closed_at)).toISOString().slice(0, 10);
      if (weeks.has(key)) weeks.get(key).closed += 1;
    }
  }

  const contributors = new Map();
  for (const commit of data.commits.filter((item) => within(item.commit.author.date, start) && selectedByContributor(item, contributor))) {
    const login = commit.author?.login || commit.commit.author.name || "Unknown";
    const entry = contributors.get(login) || { login, commits: 0, merged: 0, avatar: commit.author?.avatar_url };
    entry.commits += 1;
    contributors.set(login, entry);
  }
  for (const pull of data.pulls.filter((item) => item.merged_at && within(item.merged_at, start) && selectedByContributor(item, contributor))) {
    const login = pull.user?.login || "Unknown";
    const entry = contributors.get(login) || { login, commits: 0, merged: 0 };
    entry.merged += 1;
    contributors.set(login, entry);
  }

  const languageTotal = Object.values(data.languages).reduce((sum, count) => sum + count, 0) || 1;
  const languages = Object.entries(data.languages)
    .map(([name, count], index) => ({
      name,
      value: Math.round((count / languageTotal) * 100),
      color: ["#0969da", "#8250df", "#1a7f37", "#bf8700", "#cf222e", "#6e7781"][index % 6],
    }))
    .sort((a, b) => b.value - a.value);

  const openIssues = visibleIssues.filter((issue) => issue.state === "open" && !issue.pull_request);
  const openPulls = visiblePulls.filter((pull) => pull.state === "open");
  const stuckPulls = openPulls
    .map((pull) => ({ ...pull, waitingDays: Math.max(0, Math.floor((now - new Date(pull.created_at)) / DAY)) }))
    .sort((a, b) => b.waitingDays - a.waitingDays);
  const oldestIssues = openIssues
    .map((issue) => ({ ...issue, waitingDays: Math.max(0, Math.floor((now - new Date(issue.created_at)) / DAY)) }))
    .sort((a, b) => b.waitingDays - a.waitingDays);

  return {
    commits: filteredCommits.length,
    previousCommits: previousCommits.length,
    openIssues: contributor === "all" ? data.repo.open_issues_count ?? openIssues.length : openIssues.length,
    openPulls: openPulls.length,
    avgMergeDays: averageMergeDays(data.pulls, start, contributor),
    timeline: [...weeks.values()],
    contributors: [...contributors.values()].sort((a, b) => b.commits - a.commits).slice(0, 6),
    languages,
    punchCard: data.punchCard,
    stuckPulls,
    oldestIssues,
    openIssueIds: new Set(openIssues.map((issue) => issue.number)),
  };
}

export function getCommitDelta(current, previous) {
  if (!previous) return { value: "—", positive: true };
  const delta = Math.round(((current - previous) / previous) * 100);
  return { value: `${delta > 0 ? "+" : ""}${delta}%`, positive: delta >= 0 };
}

export function formatDuration(days) {
  if (!Number.isFinite(days)) return "—";
  return days < 1 ? `${Math.max(1, Math.round(days * 24))}h` : `${days.toFixed(1)}d`;
}
