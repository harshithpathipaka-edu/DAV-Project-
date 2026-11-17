import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleDot,
  Clock3, Code2, GitCommitHorizontal, GitFork, GitPullRequest, Github, LoaderCircle,
  Search, ShieldCheck, Star, X,
} from "lucide-react";
import { aggregateRepository, formatDuration, getCommitDelta } from "./analytics";
import { fetchApiStatus, fetchRepository, normalizeRepository, searchRepositories } from "./github";

const Charts = lazy(() => import("./Charts.jsx"));
const PERIOD_OPTIONS = ["7D", "30D", "90D", "1Y"];
const COLORS = ["#0969da", "#8250df", "#1a7f37"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function scoreRepository(repo) {
  const stars = repo.stargazers_count || 0;
  const forks = repo.forks_count || 0;
  const issues = repo.open_issues_count || 0;
  const ageDays = repo.pushed_at ? (Date.now() - new Date(repo.pushed_at).getTime()) / 86_400_000 : 365;
  const freshness = Math.max(0, 100 - ageDays / 3.65);
  const adoption = Math.min(100, (Math.log10(stars + 1) / 5) * 100);
  const community = Math.min(100, (Math.log10(forks + 1) / 4) * 100);
  const issueHealth = Math.max(0, Math.min(100, 100 - (issues / Math.max(stars, 100)) * 8_000));
  const license = repo.license ? 100 : 55;
  const score = Math.round(freshness * 0.28 + adoption * 0.27 + community * 0.13 + issueHealth * 0.22 + license * 0.1);
  return {
    ...repo,
    signalScore: repo.archived ? Math.round(score * 0.4) : score,
    signalDetails: { freshness: Math.round(freshness), adoption: Math.round(adoption), community: Math.round(community), issueHealth: Math.round(issueHealth), license: Math.round(license) },
  };
}

function timeAgo(value) {
  if (!value) return "Unknown";
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function formatCompact(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return (value || 0).toLocaleString();
}

function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-[#d0d7de] bg-white ${className}`}>
      <div className="flex min-h-[68px] items-center justify-between gap-4 border-b border-[#eaeef2] px-5 py-3">
        <div><h2 className="text-sm font-semibold">{title}</h2>{subtitle && <p className="mt-1 text-xs text-[#656d76]">{subtitle}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, note, icon: Icon, tone = "blue" }) {
  const toneClass = tone === "green" ? "bg-[#dafbe1] text-[#1a7f37]" : tone === "amber" ? "bg-[#fff8c5] text-[#9a6700]" : "bg-[#ddf4ff] text-[#0969da]";
  return (
    <article className="rounded-xl border border-[#d0d7de] bg-white p-4">
      <div className="flex items-center justify-between text-[13px] font-medium text-[#656d76]"><span>{label}</span><Icon size={16} className="text-[#8c959f]" /></div>
      <p className="mt-4 font-mono text-[28px] font-semibold leading-none tracking-tight">{value}</p>
      <span className={`mt-3 inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${toneClass}`}>{note}</span>
    </article>
  );
}

function RepoCard({ repo, selected, onToggle, onAnalyze, busy }) {
  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-[#d0d7de] bg-white p-5 transition hover:border-[#8c959f]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <img src={repo.owner?.avatar_url} alt="" className="mt-0.5 h-9 w-9 shrink-0 rounded-full bg-[#f0f2f4]" />
          <div className="min-w-0">
            <p className="truncate font-mono text-[13px] font-semibold text-[#0969da]">{repo.full_name}</p>
            <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-5 text-[#656d76]">{repo.description || "No description provided."}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 font-mono text-[11px] font-semibold ${repo.signalScore >= 70 ? "bg-[#dafbe1] text-[#1a7f37]" : repo.signalScore >= 45 ? "bg-[#fff8c5] text-[#9a6700]" : "bg-[#ffebe9] text-[#cf222e]"}`} title="Heuristic signal score based on activity, adoption, issue load, and license">
          {repo.signalScore}<span className="ml-0.5 font-sans font-medium">/100</span>
        </span>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#eaeef2] pt-3 text-[11px] text-[#656d76]">
        <span className="inline-flex items-center gap-1"><Star size={13} />{formatCompact(repo.stargazers_count)}</span>
        <span className="inline-flex items-center gap-1"><GitFork size={13} />{formatCompact(repo.forks_count)}</span>
        <span className="inline-flex items-center gap-1"><CircleDot size={13} />{formatCompact(repo.open_issues_count)}</span>
        {repo.language && <span className="inline-flex items-center gap-1"><Code2 size={13} />{repo.language}</span>}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-[#8c959f]">
        <span>Updated {timeAgo(repo.pushed_at)}</span>
        <span>{repo.license?.spdx_id || "No license detected"}</span>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={() => onToggle(repo)} className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition ${selected ? "border-[#0969da] bg-[#ddf4ff] text-[#0969da]" : "border-[#d0d7de] bg-white text-[#1f2328] hover:bg-[#f6f8fa]"}`}>
          {selected ? <Check size={14} /> : <span className="grid h-3.5 w-3.5 place-items-center rounded-sm border border-current text-[10px]">+</span>}{selected ? "Added" : "Compare"}
        </button>
        <button onClick={() => onAnalyze(repo)} disabled={busy} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#0969da] text-xs font-semibold text-white transition hover:bg-[#0860ca] disabled:opacity-60">
          {busy ? <LoaderCircle size={14} className="animate-spin" /> : <>Analyze <ArrowRight size={14} /></>}
        </button>
      </div>
    </article>
  );
}

function App() {
  const [view, setView] = useState("explore");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("best");
  const [results, setResults] = useState([]);
  const [repoCache, setRepoCache] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selected, setSelected] = useState([]);
  const [busyRepo, setBusyRepo] = useState("");
  const [activeRepo, setActiveRepo] = useState("");
  const [repositoryData, setRepositoryData] = useState(null);
  const [period, setPeriod] = useState("30D");
  const [contributor, setContributor] = useState("all");
  const [apiStatus, setApiStatus] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const searchRequest = useRef(null);
  const analyticsRequest = useRef(null);

  const sortedResults = useMemo(() => {
    const items = [...results];
    if (sort === "best") items.sort((a, b) => b.signalScore - a.signalScore);
    if (sort === "stars") items.sort((a, b) => b.stargazers_count - a.stargazers_count);
    if (sort === "recent") items.sort((a, b) => new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0));
    return items;
  }, [results, sort]);

  const stats = useMemo(() => repositoryData ? aggregateRepository(repositoryData, period, contributor) : null, [repositoryData, period, contributor]);
  const contributors = useMemo(() => {
    const logins = new Set((repositoryData?.commits || []).map((commit) => commit.author?.login).filter(Boolean));
    return [...logins].sort((a, b) => a.localeCompare(b));
  }, [repositoryData]);
  const selectedRepos = useMemo(() => selected.map((fullName) => repoCache[fullName]).filter(Boolean), [selected, repoCache]);
  const comparisonWinner = useMemo(() => [...selectedRepos].sort((a, b) => b.signalScore - a.signalScore)[0], [selectedRepos]);
  const timeline = stats?.timeline || [];
  const maxCommits = Math.max(...(stats?.contributors || []).map((person) => person.commits), 1);
  const maxHeat = Math.max(...(stats?.punchCard || []).map((entry) => entry[2]), 1);

  useEffect(() => {
    fetchApiStatus().then(setApiStatus).catch(() => setApiStatus({ tokenConfigured: false }));
    return () => {
      searchRequest.current?.abort();
      analyticsRequest.current?.abort();
    };
  }, []);

  async function search(queryText = query, selectedSort = sort) {
    const text = queryText.trim();
    if (text.length < 2) {
      setSearchError("Enter at least 2 characters, a topic, or a GitHub search qualifier.");
      return;
    }
    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    setSearchLoading(true);
    setSearchError("");
    setSearched(true);
    try {
      const result = await searchRepositories(text, selectedSort === "recent" ? "updated" : "stars", controller.signal);
      const scored = (result.items || []).map(scoreRepository);
      setResults(scored);
      setRepoCache((current) => ({ ...current, ...Object.fromEntries(scored.map((repo) => [repo.full_name, repo])) }));
      setTotalCount(result.totalCount || 0);
      setView("explore");
    } catch (error) {
      if (error.name === "AbortError") return;
      setSearchError(`${error.message}${error.rateLimited ? " Add GITHUB_TOKEN in .env to increase the API limit." : ""}`);
      setResults([]);
    } finally {
      if (!controller.signal.aborted) setSearchLoading(false);
    }
  }

  async function analyze(repo) {
    analyticsRequest.current?.abort();
    const controller = new AbortController();
    analyticsRequest.current = controller;
    setActiveRepo(repo.full_name);
    setBusyRepo(repo.full_name);
    setRepositoryData(null);
    setDashboardError("");
    setView("dashboard");
    setContributor("all");
    try {
      const data = await fetchRepository(repo.full_name, controller.signal);
      setRepositoryData(data);
    } catch (error) {
      if (error.name === "AbortError") return;
      setDashboardError(`${error.message}${error.rateLimited ? " Configure GITHUB_TOKEN in .env to increase the API limit." : ""}`);
    } finally {
      if (!controller.signal.aborted) setBusyRepo("");
    }
  }

  function toggleCompare(repo) {
    if (selected.includes(repo.full_name)) {
      setSelected((current) => current.filter((name) => name !== repo.full_name));
      return;
    }
    if (selected.length >= 3) {
      setSearchError("Compare up to 3 repositories at a time. Remove one to add another.");
      return;
    }
    setSearchError("");
    setSelected((current) => current.includes(repo.full_name) ? current : [...current, repo.full_name]);
  }

  function submitSearch(event) {
    event.preventDefault();
    const identifier = normalizeRepository(query);
    const looksLikeUrl = /github\.com\//i.test(query);
    if (identifier && (looksLikeUrl || /^[\w.-]+\/[\w.-]+$/.test(query.trim()))) {
      analyze({ full_name: identifier.fullName });
      return;
    }
    search();
  }

  const radarData = [
    { metric: "Activity", ...(Object.fromEntries(selectedRepos.map((repo) => [repo.full_name, repo.signalDetails.freshness]))) },
    { metric: "Adoption", ...(Object.fromEntries(selectedRepos.map((repo) => [repo.full_name, repo.signalDetails.adoption]))) },
    { metric: "Community", ...(Object.fromEntries(selectedRepos.map((repo) => [repo.full_name, repo.signalDetails.community]))) },
    { metric: "Issue signal", ...(Object.fromEntries(selectedRepos.map((repo) => [repo.full_name, repo.signalDetails.issueHealth]))) },
    { metric: "License", ...(Object.fromEntries(selectedRepos.map((repo) => [repo.full_name, repo.signalDetails.license]))) },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-[#1f2328]">
      <header className="border-b border-[#d0d7de] bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <button onClick={() => setView("explore")} className="flex items-center gap-3 text-left">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#1f2328] text-white"><Github size={20} /></span>
            <span><span className="block text-sm font-semibold tracking-tight">GitHub Signal</span><span className="block text-[10px] text-[#656d76]">Repository intelligence</span></span>
          </button>
          <nav className="flex items-center gap-1 rounded-lg border border-[#d0d7de] bg-[#f6f8fa] p-1" aria-label="Main navigation">
            <button onClick={() => setView("explore")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${view !== "compare" ? "bg-white text-[#1f2328] shadow-sm" : "text-[#656d76] hover:text-[#1f2328]"}`}>Explore</button>
            <button onClick={() => setView("compare")} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === "compare" ? "bg-white text-[#1f2328] shadow-sm" : "text-[#656d76] hover:text-[#1f2328]"}`}>
              Compare <span className="rounded-full bg-[#eaeef2] px-1.5 py-0.5 font-mono text-[10px]">{selected.length}</span>
            </button>
          </nav>
          <div className="hidden items-center gap-1.5 text-[11px] text-[#656d76] sm:flex">
            <span className={`h-2 w-2 rounded-full ${apiStatus?.tokenConfigured ? "bg-[#1a7f37]" : "bg-[#bf8700]"}`} />
            {apiStatus?.tokenConfigured ? "Server token configured" : apiStatus ? "Public API · lower limit" : "Connecting"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 sm:py-9">
        {(view === "explore" || view === "compare") && (
          <>
            <section className="mx-auto max-w-4xl text-center">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-[#d0d7de] bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-[.08em] text-[#656d76]"><Activity size={12} className="text-[#0969da]" /> Evidence-led repository discovery</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-1.2px] sm:text-[40px]">Find the right repo.<br className="sm:hidden" /> See the full picture.</h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#656d76]">Search GitHub, compare the signals that matter, and inspect real repository activity — all in one calm, decision-ready workspace.</p>
              <form onSubmit={submitSearch} className="mx-auto mt-6 flex max-w-[760px] flex-col gap-2 rounded-xl border border-[#d0d7de] bg-white p-2 shadow-[0_1px_2px_rgba(31,35,40,.04)] sm:flex-row">
                <label className="flex min-w-0 flex-1 items-center gap-3 px-2">
                  <Search size={18} className="shrink-0 text-[#656d76]" />
                  <input aria-label="Search repositories or enter owner and repository" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search repos, topics, languages — or enter owner/repo" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8c959f]" />
                  <select value={sort} onChange={(event) => { const nextSort = event.target.value; setSort(nextSort); if (searched) search(query, nextSort); }} aria-label="Sort repository results" className="h-9 max-w-[126px] rounded-md border border-[#d0d7de] bg-white px-2 text-[11px] text-[#656d76] outline-none focus:border-[#0969da]">
                    <option value="best">Best fit</option><option value="stars">Most stars</option><option value="recent">Recently active</option>
                  </select>
                </label>
                <button type="submit" disabled={searchLoading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0969da] px-5 text-sm font-semibold text-white transition hover:bg-[#0860ca] disabled:opacity-65">
                  {searchLoading ? <LoaderCircle size={16} className="animate-spin" /> : <>Search GitHub <ArrowRight size={15} /></>}
                </button>
              </form>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="mr-1 text-[11px] text-[#8c959f]">Quick search</span>
                {["react", "next.js language:TypeScript", "developer tools"].map((item) => <button key={item} onClick={() => { setQuery(item); search(item, sort); }} className="rounded-full border border-[#d0d7de] bg-white px-3 py-1.5 font-mono text-[10px] text-[#656d76] transition hover:border-[#0969da] hover:text-[#0969da]">{item}</button>)}
              </div>
              {!apiStatus?.tokenConfigured && apiStatus && <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-[#8c959f]"><ShieldCheck size={12} /> Public GitHub API access. Set <code className="rounded bg-[#eaeef2] px-1 font-mono">GITHUB_TOKEN</code> in server .env for a higher rate limit.</p>}
              {searchError && <p role="alert" className="mx-auto mt-4 max-w-2xl rounded-md border border-[#ff8182] bg-[#ffebe9] px-3 py-2 text-left text-xs text-[#cf222e]">{searchError}</p>}
            </section>

            {view === "explore" && (
              <section className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#d0d7de] pb-3">
                  <div><p className="text-[11px] font-medium uppercase tracking-[.08em] text-[#656d76]">{searched ? "Search results" : "Ready when you are"}</p><h2 className="mt-1 text-lg font-semibold">{searched ? `${totalCount.toLocaleString()} repositories found` : "Start with a search or a repository URL"}</h2></div>
                  <div className="flex items-center gap-2">
                    {selected.length > 0 && <button onClick={() => setView("compare")} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#0969da] bg-[#ddf4ff] px-3 text-xs font-semibold text-[#0969da] hover:bg-[#b6e3ff]">Compare {selected.length} <ArrowRight size={14} /></button>}
                    {searched && <span className="text-[11px] text-[#8c959f]">Ranked by {sort === "best" ? "balanced signal" : sort === "stars" ? "stars" : "recent activity"}</span>}
                  </div>
                </div>
                {searchLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-[210px] animate-pulse rounded-xl border border-[#d0d7de] bg-white p-5"><div className="h-4 w-32 rounded bg-[#eaeef2]" /><div className="mt-4 h-10 rounded bg-[#f6f8fa]" /><div className="mt-6 h-4 w-2/3 rounded bg-[#eaeef2]" /></div>)}</div>
                  : sortedResults.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{sortedResults.map((repo) => <RepoCard key={repo.id} repo={repo} selected={selected.includes(repo.full_name)} onToggle={toggleCompare} onAnalyze={analyze} busy={busyRepo === repo.full_name} />)}</div>
                    : searched && !searchError ? <div className="rounded-xl border border-dashed border-[#d0d7de] bg-white px-6 py-16 text-center"><Search size={22} className="mx-auto text-[#8c959f]" /><p className="mt-3 text-sm font-medium">No repositories found</p><p className="mt-1 text-xs text-[#656d76]">Try a broader keyword or GitHub search qualifier.</p></div>
                      : !searched ? <div className="grid gap-3 md:grid-cols-3">{[
                        { icon: Search, title: "Search the ecosystem", body: "Find open source projects by name, topic, or language." },
                        { icon: GitFork, title: "Compare up to three", body: "Balance adoption, activity, maintenance, and licensing signals." },
                        { icon: Activity, title: "Go beyond the stars", body: "Analyze commit velocity, contributors, languages, and project health." },
                      ].map((item) => <article key={item.title} className="rounded-xl border border-[#d0d7de] bg-white p-5"><item.icon size={18} className="text-[#0969da]" /><h3 className="mt-4 text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs leading-5 text-[#656d76]">{item.body}</p></article>)}</div> : null}
                <p className="text-[10px] leading-5 text-[#8c959f]">Best fit is a transparent heuristic using recent activity, adoption, issue load, and license signals. It is a starting point for research — not a quality or security verdict.</p>
              </section>
            )}

            {view === "compare" && (
              <section className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><p className="text-[11px] font-medium uppercase tracking-[.08em] text-[#656d76]">Side-by-side analysis</p><h2 className="mt-1 text-xl font-semibold">Compare repositories</h2><p className="mt-1 text-xs text-[#656d76]">Compare up to three live GitHub search results using the same transparent signals.</p></div>
                  <button onClick={() => setView("explore")} className="inline-flex items-center gap-2 rounded-md border border-[#d0d7de] bg-white px-3 py-2 text-xs font-medium hover:bg-[#f6f8fa]"><ArrowLeft size={14} /> Back to search</button>
                </div>
                {selectedRepos.length < 2 ? <div className="rounded-xl border border-dashed border-[#d0d7de] bg-white p-10 text-center"><GitFork size={22} className="mx-auto text-[#8c959f]" /><h3 className="mt-3 text-sm font-semibold">Choose at least two repositories</h3><p className="mt-1 text-xs text-[#656d76]">Return to search results and select repositories with the Compare button.</p><button onClick={() => setView("explore")} className="mt-4 rounded-md bg-[#0969da] px-4 py-2 text-xs font-semibold text-white">Explore repositories</button></div>
                  : <>
                    <div className="grid gap-3 md:grid-cols-3">{selectedRepos.map((repo, index) => <article key={repo.id} className="relative rounded-xl border border-[#d0d7de] bg-white p-5">
                      <button onClick={() => toggleCompare(repo)} aria-label={`Remove ${repo.full_name} from comparison`} className="absolute right-4 top-4 text-[#8c959f] hover:text-[#cf222e]"><X size={15} /></button>
                      <p className="pr-6 font-mono text-xs font-semibold text-[#0969da]">{repo.full_name}</p>
                      <p className="mt-4 font-mono text-4xl font-semibold tracking-tight">{repo.signalScore}<span className="ml-1 text-sm font-medium text-[#8c959f]">/100</span></p>
                      <p className="mt-1 text-[11px] text-[#656d76]">Repository signal score</p>
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#f0f2f4]"><div className="h-full rounded-full" style={{ width: `${repo.signalScore}%`, backgroundColor: COLORS[index] }} /></div>
                      <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-[#656d76]"><span><Star size={12} className="mr-1 inline" />{formatCompact(repo.stargazers_count)}</span><span><GitFork size={12} className="mr-1 inline" />{formatCompact(repo.forks_count)}</span><span><Activity size={12} className="mr-1 inline" />{timeAgo(repo.pushed_at)}</span></div>
                    </article>)}</div>
                    <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
                      <Panel title="Signal profile" subtitle="Normalized to a 0–100 scale">
                        <div className="h-[320px] p-4"><Suspense fallback={<div className="h-full animate-pulse rounded bg-[#f6f8fa]" />}><Charts type="radar" data={radarData} repositories={selectedRepos.map((repo, index) => ({ ...repo, color: COLORS[index] }))} /></Suspense></div>
                      </Panel>
                      <Panel title="Decision snapshot" subtitle="The measured differences behind the recommendation">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[560px] text-left text-xs">
                            <thead><tr className="bg-[#f6f8fa] text-[10px] uppercase tracking-wide text-[#656d76]"><th className="px-4 py-3">Signal</th>{selectedRepos.map((repo) => <th key={repo.id} className="max-w-[160px] truncate px-3 py-3 font-mono normal-case tracking-normal">{repo.full_name}</th>)}</tr></thead>
                            <tbody className="divide-y divide-[#eaeef2]">{[
                              ["Stars", (repo) => formatCompact(repo.stargazers_count), (repo) => repo.stargazers_count],
                              ["Forks", (repo) => formatCompact(repo.forks_count), (repo) => repo.forks_count],
                              ["Open issues", (repo) => formatCompact(repo.open_issues_count), (repo) => -repo.open_issues_count],
                              ["Primary language", (repo) => repo.language || "Not specified", () => 0],
                              ["Last push", (repo) => timeAgo(repo.pushed_at), (repo) => -new Date(repo.pushed_at || 0).getTime()],
                              ["License", (repo) => repo.license?.spdx_id || "None detected", (repo) => repo.license ? 1 : 0],
                            ].map(([label, display, value]) => {
                              const best = Math.max(...selectedRepos.map(value));
                              return <tr key={label}><th className="px-4 py-3 font-medium text-[#656d76]">{label}</th>{selectedRepos.map((repo) => <td key={repo.id} className={`px-3 py-3 font-mono ${value(repo) === best && best !== 0 ? "font-semibold text-[#1a7f37]" : "text-[#1f2328]"}`}>{display(repo)}</td>)}</tr>;
                            })}</tbody>
                          </table>
                        </div>
                        {comparisonWinner && <div className="m-4 flex items-start gap-3 rounded-lg border border-[#a2d2a8] bg-[#dafbe1]/50 p-4">
                          <Check size={16} className="mt-0.5 shrink-0 text-[#1a7f37]" />
                          <div><p className="text-xs font-semibold text-[#1a7f37]">Best balanced signals: <span className="font-mono">{comparisonWinner.full_name}</span></p><p className="mt-1 text-[11px] leading-5 text-[#656d76]">Score is weighted across activity (28%), adoption (27%), issue signal (22%), community (13%), and license (10%). Archived projects are penalized. Use this as a shortlist, then review the project directly.</p></div>
                        </div>}
                      </Panel>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">{selectedRepos.map((repo) => <button key={repo.id} onClick={() => analyze(repo)} className="flex items-center justify-between rounded-lg border border-[#d0d7de] bg-white px-4 py-3 text-left transition hover:border-[#0969da]"><span><span className="block font-mono text-xs font-semibold">{repo.full_name}</span><span className="mt-1 block text-[10px] text-[#656d76]">Open full analytics dashboard</span></span><ArrowUpRight size={16} className="text-[#0969da]" /></button>)}</div>
                  </>}
              </section>
            )}
          </>
        )}

        {view === "dashboard" && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button onClick={() => setView("explore")} className="inline-flex items-center gap-2 text-xs font-medium text-[#656d76] hover:text-[#0969da]"><ArrowLeft size={14} /> Back to discovery</button>
              {repositoryData && <a href={repositoryData.repo.html_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0969da] hover:underline">View on GitHub <ArrowUpRight size={13} /></a>}
            </div>
            {busyRepo && <div role="status" className="flex items-center gap-3 rounded-xl border border-[#d0d7de] bg-white p-5"><LoaderCircle size={17} className="animate-spin text-[#0969da]" /><div><p className="text-sm font-semibold">Analyzing {busyRepo}</p><p className="mt-1 text-xs text-[#656d76]">Loading live repository, commit, issue, pull request, and language data…</p></div></div>}
            {dashboardError && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-[#ff8182] bg-[#ffebe9] px-4 py-3 text-xs text-[#cf222e]">{dashboardError}<button onClick={() => activeRepo && analyze({ full_name: activeRepo })} className="shrink-0 underline">Retry</button></div>}
            {repositoryData && stats && <>
              <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#d0d7de] bg-white p-5 lg:flex-row lg:items-end">
                <div><p className="text-[10px] font-medium uppercase tracking-[.1em] text-[#656d76]">Repository health</p><h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight">{repositoryData.repo.full_name}</h1><p className="mt-2 max-w-2xl text-xs leading-5 text-[#656d76]">{repositoryData.repo.description || "No repository description provided."}</p><div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[#656d76]"><span><Star size={13} className="mr-1 inline" />{formatCompact(repositoryData.repo.stargazers_count)} stars</span><span><GitFork size={13} className="mr-1 inline" />{formatCompact(repositoryData.repo.forks_count)} forks</span><span><Code2 size={13} className="mr-1 inline" />{repositoryData.repo.default_branch} branch</span></div></div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-1">{PERIOD_OPTIONS.map((option) => <button key={option} onClick={() => setPeriod(option)} aria-pressed={period === option} className={`rounded px-3 py-1.5 font-mono text-[11px] ${period === option ? "bg-white font-semibold shadow-sm" : "text-[#656d76]"}`}>{option}</button>)}</div>
                  <label className="flex h-9 items-center gap-2 rounded-md border border-[#d0d7de] bg-white px-3"><span className="text-[11px] text-[#656d76]">Contributor</span><select aria-label="Filter dashboard by contributor" value={contributor} onChange={(event) => setContributor(event.target.value)} className="max-w-[150px] bg-transparent font-mono text-[11px] outline-none"><option value="all">Everyone</option>{contributors.map((login) => <option key={login} value={login}>{login}</option>)}</select><ChevronDown size={12} className="text-[#656d76]" /></label>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Commits" value={stats.commits.toLocaleString()} note={`${getCommitDelta(stats.commits, stats.previousCommits).value} vs previous period`} icon={GitCommitHorizontal} />
                <Metric label="Open issues" value={stats.openIssues.toLocaleString()} note="Current unresolved" icon={CircleDot} tone={stats.openIssues > 1000 ? "amber" : "blue"} />
                <Metric label="Open pull requests" value={stats.openPulls.toLocaleString()} note={`${stats.stuckPulls.filter((pull) => pull.waitingDays > 5).length} waiting over 5 days`} icon={GitPullRequest} tone={stats.stuckPulls.some((pull) => pull.waitingDays > 5) ? "amber" : "green"} />
                <Metric label="Average time to merge" value={formatDuration(stats.avgMergeDays)} note={stats.avgMergeDays === null ? "No merged PRs in available sample" : `Merged PRs in selected ${period}`} icon={Clock3} tone={stats.avgMergeDays === null ? "blue" : stats.avgMergeDays <= 5 ? "green" : "amber"} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Commit velocity" subtitle={`Weekly commits · trailing ${period}`}>
                  <div className="h-[270px] p-4"><Suspense fallback={<div className="h-full animate-pulse rounded bg-[#f6f8fa]" />}><Charts type="commits" data={timeline} /></Suspense></div>
                </Panel>
                <Panel title="Issue flow" subtitle="Issues opened and closed per week">
                  <div className="flex gap-4 px-5 pt-4 text-[11px] text-[#656d76]"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#bf8700]" />Opened</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#1a7f37]" />Closed</span></div>
                  <div className="h-[246px] p-4 pt-2"><Suspense fallback={<div className="h-full animate-pulse rounded bg-[#f6f8fa]" />}><Charts type="issues" data={timeline} /></Suspense></div>
                </Panel>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_.85fr_1.25fr]">
                <Panel title="Top contributors" subtitle="Commits in selected period"><div className="space-y-3 px-5 py-4">{stats.contributors.map((person) => <button key={person.login} onClick={() => setContributor(contributor === person.login ? "all" : person.login)} className={`flex w-full items-center gap-3 rounded px-1 py-1 text-left ${contributor === person.login ? "bg-[#ddf4ff]" : ""}`}><img src={person.avatar} alt="" className="h-6 w-6 rounded-full bg-[#f0f2f4]" /><span className="w-24 truncate font-mono text-[11px]">{person.login}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0f2f4]"><span className="block h-full rounded-full bg-[#0969da]" style={{ width: `${(person.commits / maxCommits) * 100}%` }} /></span><span className="w-9 text-right font-mono text-[10px] text-[#656d76]">{person.commits}</span></button>)}{!stats.contributors.length && <p className="py-12 text-center text-xs text-[#8c959f]">No contributors in this period.</p>}</div></Panel>
                <Panel title="Languages" subtitle="Code composition"><div className="flex min-h-[210px] items-center gap-2 px-4 py-3"><div className="h-[180px] min-w-0 flex-1"><Suspense fallback={<div className="h-full animate-pulse rounded bg-[#f6f8fa]" />}><Charts type="languages" data={stats.languages} /></Suspense></div><div className="w-[105px] space-y-2">{stats.languages.slice(0, 5).map((language) => <div key={language.name} className="flex items-center gap-1.5"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: language.color }} /><span className="min-w-0 flex-1 truncate text-[10px] text-[#656d76]">{language.name}</span><span className="font-mono text-[10px]">{language.value}%</span></div>)}</div></div></Panel>
                <Panel title="Activity by time" subtitle="Commit distribution · day × hour (UTC)" action={<Activity size={15} className="text-[#8c959f]" />}><div className="px-5 py-4"><div className="space-y-[3px]">{DAYS.map((dayName, day) => <div key={dayName} className="grid grid-cols-[30px_repeat(24,minmax(0,1fr))] items-center gap-[3px]"><span className="text-[9px] text-[#8c959f]">{dayName}</span>{Array.from({ length: 24 }, (_, hour) => { const count = stats.punchCard.find((entry) => entry[0] === day && entry[1] === hour)?.[2] || 0; return <span key={hour} title={`${dayName} ${String(hour).padStart(2, "0")}:00 UTC · ${count} commits`} className="aspect-square min-w-0 rounded-[2px] bg-[#1a7f37] hover:outline hover:outline-1 hover:outline-[#1f2328]" style={{ opacity: count ? 0.2 + (count / maxHeat) * 0.8 : 0.08 }} />; })}</div>)}</div><p className="mt-3 text-right text-[9px] text-[#8c959f]">Hover a cell for exact count</p></div></Panel>
              </div>

              <Panel title="Needs attention" subtitle="Open pull requests and issues waiting longest">
                <div className="grid gap-0 divide-y divide-[#eaeef2] md:grid-cols-2 md:divide-x md:divide-y-0">
                  <div><h3 className="px-5 py-3 text-xs font-semibold"><GitPullRequest size={14} className="mr-2 inline text-[#8250df]" />Stuck pull requests</h3>{stats.stuckPulls.slice(0, 5).map((item) => <a key={item.number} href={item.html_url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 border-t border-[#eaeef2] px-5 py-3 hover:bg-[#f6f8fa]"><span className="min-w-0"><span className="mr-2 font-mono text-[10px] text-[#656d76]">#{item.number}</span><span className="text-xs text-[#0969da]">{item.title}</span><span className="mt-1 block font-mono text-[10px] text-[#8c959f]">@{item.user?.login}</span></span><span className={`shrink-0 rounded-full px-2 py-1 font-mono text-[10px] ${item.waitingDays > 5 ? "bg-[#ffebe9] text-[#cf222e]" : "bg-[#f6f8fa] text-[#656d76]"}`}>{item.waitingDays}d</span></a>)}{!stats.stuckPulls.length && <p className="px-5 py-8 text-xs text-[#656d76]">No open pull requests found in the latest 100 results.</p>}</div>
                  <div><h3 className="px-5 py-3 text-xs font-semibold"><CircleDot size={14} className="mr-2 inline text-[#1a7f37]" />Oldest open issues</h3>{stats.oldestIssues.slice(0, 5).map((item) => <a key={item.number} href={item.html_url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 border-t border-[#eaeef2] px-5 py-3 hover:bg-[#f6f8fa]"><span className="min-w-0"><span className="mr-2 font-mono text-[10px] text-[#656d76]">#{item.number}</span><span className="text-xs text-[#0969da]">{item.title}</span><span className="mt-1 block font-mono text-[10px] text-[#8c959f]">@{item.user?.login}</span></span><span className={`shrink-0 rounded-full px-2 py-1 font-mono text-[10px] ${item.waitingDays > 5 ? "bg-[#ffebe9] text-[#cf222e]" : "bg-[#f6f8fa] text-[#656d76]"}`}>{item.waitingDays}d</span></a>)}{!stats.oldestIssues.length && <p className="px-5 py-8 text-xs text-[#656d76]">No open issues found in the latest 100 results.</p>}</div>
                </div>
              </Panel>
              <p className="text-[10px] leading-5 text-[#8c959f]">GitHub REST API data · Commit and issue activity uses the latest API page (up to 100 records per endpoint). Average merge time uses available merged pull requests. Analytics are directional, not a substitute for repository review.</p>
            </>}
          </section>
        )}
      </main>
      <footer className="border-t border-[#d0d7de] bg-white"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-5 py-4 text-[10px] text-[#8c959f] sm:px-8"><span>GitHub Signal · Built for better open-source decisions</span><span>GitHub REST API · Activity timestamps in UTC</span></div></footer>
    </div>
  );
}

export default App;
