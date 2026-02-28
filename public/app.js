// ── State ────────────────────────────────────────────
let newsData = [];
let socialData = [];
let activeSource = "all";

// ── DOM Elements ────────────────────────────────────
const grid = document.getElementById("news-grid");
const loading = document.getElementById("loading");
const errorState = document.getElementById("error-state");
const tabsContainer = document.getElementById("source-tabs");
const refreshBtn = document.getElementById("refresh-btn");
const lastUpdated = document.getElementById("last-updated");

// ── Init ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadNews();
  refreshBtn.addEventListener("click", () => loadNews(true));
});

// ── Fetch News + Social ─────────────────────────────
async function loadNews(forceRefresh = false) {
  loading.style.display = "block";
  errorState.style.display = "none";
  grid.innerHTML = "";

  refreshBtn.classList.add("spinning");

  try {
    const suffix = forceRefresh ? "?refresh=true" : "";
    const [newsRes, socialRes] = await Promise.all([
      fetch("/api/news" + suffix),
      fetch("/api/social" + suffix),
    ]);

    const newsJson = await newsRes.json();
    const socialJson = await socialRes.json();

    if (!newsJson.success) throw new Error("News API error");

    newsData = newsJson.data;
    socialData = socialJson.success ? socialJson.data : [];

    buildTabs();
    renderNews();
    updateTimestamp(newsJson.timestamp);
  } catch (err) {
    console.error("Failed to load news:", err);
    errorState.style.display = "block";
  } finally {
    loading.style.display = "none";
    refreshBtn.classList.remove("spinning");
  }
}

// ── Build Tabs ──────────────────────────────────────
function buildTabs() {
  tabsContainer.innerHTML =
    '<button class="tab active" data-source="all">All Sources</button>';

  newsData.forEach((source) => {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.dataset.source = source.id;
    btn.textContent = `${source.icon} ${source.name}`;
    tabsContainer.appendChild(btn);
  });

  // Social tabs
  socialData.forEach((source) => {
    const btn = document.createElement("button");
    btn.className = "tab social-tab";
    btn.dataset.source = source.id;
    btn.textContent = `${source.icon} ${source.name}`;
    tabsContainer.appendChild(btn);
  });

  tabsContainer.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;

    tabsContainer
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    activeSource = tab.dataset.source;
    renderNews();
  });
}

// ── Render News ─────────────────────────────────────
function renderNews() {
  grid.innerHTML = "";

  // Determine what to show
  const isSocialFilter = socialData.some((s) => s.id === activeSource);
  const isAll = activeSource === "all";

  // Render news sources
  if (isAll || !isSocialFilter) {
    const sources = isAll
      ? newsData
      : newsData.filter((s) => s.id === activeSource);

    sources.forEach((source) => {
      grid.appendChild(buildSourceSection(source, false));
    });
  }

  // Render social section
  if (isAll || isSocialFilter) {
    const socialSources = isAll
      ? socialData
      : socialData.filter((s) => s.id === activeSource);

    if (socialSources.length > 0) {
      // Add divider before social section (only in "all" view)
      if (isAll) {
        const divider = document.createElement("div");
        divider.className = "section-divider";
        divider.innerHTML = `
          <div class="section-divider-inner">
            <div class="section-divider-line"></div>
            <span class="section-divider-label">Social Trending - UAE</span>
            <div class="section-divider-line"></div>
          </div>
        `;
        grid.appendChild(divider);
      }

      socialSources.forEach((source) => {
        grid.appendChild(buildSourceSection(source, true));
      });
    }
  }
}

function buildSourceSection(source, isSocial) {
  const section = document.createElement("section");
  section.className = "source-section" + (isSocial ? " social-section" : "");

  const hasArticles = source.articles && source.articles.length > 0;

  section.innerHTML = `
    <div class="source-header">
      <div class="source-badge" style="background: ${hexToRgba(source.color, 0.15)}">
        ${source.icon}
      </div>
      <h2 class="source-name">${source.name}</h2>
      <span class="source-count">${hasArticles ? source.articles.length + " stories" : "No stories available"}</span>
    </div>
    ${
      hasArticles
        ? `<div class="articles">${source.articles
            .map((article, i) =>
              articleCard(article, i, source.color, source.icon)
            )
            .join("")}</div>`
        : `<div class="source-no-articles">Unable to fetch stories from this source right now. Try again later.</div>`
    }
  `;

  return section;
}

// ── Article Card ────────────────────────────────────
function articleCard(article, index, color, sourceIcon) {
  const date = article.pubDate ? formatDate(article.pubDate) : "";
  const summary = article.summary || "No summary available.";

  return `
    <a href="${escapeAttr(article.link)}" target="_blank" rel="noopener noreferrer"
       class="article-card" style="--card-accent: ${color}">
      <div class="article-body">
        <div class="article-top">
          <span class="article-number">${index + 1}</span>
          <h3 class="article-title">${escapeHtml(article.title)}</h3>
        </div>
        <p class="article-summary">${escapeHtml(summary)}</p>
      </div>
      <div class="article-meta">
        <span class="article-date">${date || ""}</span>
        <span class="article-read">
          Read
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </span>
      </div>
    </a>
  `;
}

// ── Utilities ───────────────────────────────────────
function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function updateTimestamp(ts) {
  const d = new Date(ts);
  lastUpdated.textContent = `Updated ${d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function hexToRgba(hex, alpha) {
  if (!hex || hex.length < 7) return `rgba(100,100,100,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
