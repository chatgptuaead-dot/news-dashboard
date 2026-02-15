// ── State ────────────────────────────────────────────
let newsData = [];
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

// ── Fetch News ──────────────────────────────────────
async function loadNews(forceRefresh = false) {
  loading.style.display = "block";
  errorState.style.display = "none";
  grid.innerHTML = "";

  refreshBtn.classList.add("spinning");

  try {
    const url = forceRefresh ? "/api/news?refresh=true" : "/api/news";
    const res = await fetch(url);
    const json = await res.json();

    if (!json.success) throw new Error("API error");

    newsData = json.data;
    buildTabs();
    renderNews();
    updateTimestamp(json.timestamp);
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
  // Keep the "All Sources" tab
  tabsContainer.innerHTML =
    '<button class="tab active" data-source="all">All Sources</button>';

  newsData.forEach((source) => {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.dataset.source = source.id;
    btn.textContent = `${source.icon} ${source.name}`;
    tabsContainer.appendChild(btn);
  });

  // Tab click handling
  tabsContainer.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;

    tabsContainer.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    activeSource = tab.dataset.source;
    renderNews();
  });
}

// ── Render News ─────────────────────────────────────
function renderNews() {
  grid.innerHTML = "";

  const sources =
    activeSource === "all"
      ? newsData
      : newsData.filter((s) => s.id === activeSource);

  sources.forEach((source) => {
    const section = document.createElement("section");
    section.className = "source-section";

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
              .map((article, i) => articleCard(article, i, source.color))
              .join("")}</div>`
          : `<div class="source-no-articles">Unable to fetch stories from this source right now. Try again later.</div>`
      }
    `;

    grid.appendChild(section);
  });
}

// ── Mixed Article Card (shows source label) ────────
function mixedArticleCard(article, index) {
  const date = article.pubDate ? formatDate(article.pubDate) : "";
  const summary = article.summary || "No summary available.";

  return `
    <a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer"
       class="article-card" style="--card-accent: ${article.sourceColor}">
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span class="article-source-tag" style="background:${hexToRgba(article.sourceColor, 0.15)}; color:${article.sourceColor};">
          ${article.sourceIcon} ${escapeHtml(article.sourceName)}
        </span>
        ${date ? `<span class="article-date">${date}</span>` : ""}
      </div>
      <h3 class="article-title">${escapeHtml(article.title)}</h3>
      <p class="article-summary">${escapeHtml(summary)}</p>
      <div class="article-meta">
        <span class="article-date">${date ? "Published " + date : ""}</span>
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

// ── Article Card ────────────────────────────────────
function articleCard(article, index, color) {
  const date = article.pubDate ? formatDate(article.pubDate) : "";
  const summary = article.summary || "No summary available.";

  return `
    <a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer"
       class="article-card" style="--card-accent: ${color}">
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="article-number">${index + 1}</span>
        ${date ? `<span class="article-date">${date}</span>` : ""}
      </div>
      <h3 class="article-title">${escapeHtml(article.title)}</h3>
      <p class="article-summary">${escapeHtml(summary)}</p>
      <div class="article-meta">
        <span class="article-date">${date ? "Published " + date : ""}</span>
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
