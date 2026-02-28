const express = require("express");
const path = require("path");
const RSSParser = require("rss-parser");

const app = express();
const parser = new RSSParser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["content:encoded", "content:encoded"],
    ],
  },
});

const parserSimple = new RSSParser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

// Lenient XML fetch + regex parser for feeds that rss-parser can't handle
async function fetchFeedRaw(feedUrl) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const xml = await res.text();

    // Extract items with regex (lenient parsing)
    const items = [];
    const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
      const block = match[1];
      const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const link = block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const desc = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const pubDate = block.match(/<pubDate[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
      const contentEncoded = block.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);

      if (title) {
        const item = {
          title: stripHtml(title[1]),
          link: (link && link[1] || '').trim(),
          description: desc ? desc[1] : '',
          pubDate: pubDate ? pubDate[1].trim() : null,
        };
        if (contentEncoded) item['content:encoded'] = contentEncoded[1];
        items.push(item);
      }
    }
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

const PORT = process.env.PORT || 3456;

// News outlet configurations
const NEWS_SOURCES = [
  {
    id: "wam",
    name: "WAM",
    color: "#00843D",
    icon: "🇦🇪",
    feeds: [
      "https://www.wam.ae/en/rss/all",
      "https://wam.ae/en/rss/all",
      "https://www.wam.ae/en/rss",
      "https://news.google.com/rss/search?q=site:wam.ae&hl=en",
    ],
  },
  {
    id: "aletihad",
    name: "Al Etihad",
    color: "#1B4F72",
    icon: "📰",
    feeds: [
      "https://news.google.com/rss/search?q=site:aletihad.ae&hl=ar",
    ],
  },
  {
    id: "alkhaleej",
    name: "Al Khaleej",
    color: "#C0392B",
    icon: "📜",
    feeds: [
      "https://news.google.com/rss/search?q=site:alkhaleej.ae&hl=ar",
    ],
  },
  {
    id: "thenational",
    name: "The National News",
    color: "#003B5C",
    icon: "🏛️",
    feeds: [
      "https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml",
      "https://www.thenationalnews.com/rss",
      "https://news.google.com/rss/search?q=site:thenationalnews.com&hl=en",
    ],
  },
  {
    id: "albayan",
    name: "Al Bayan",
    color: "#2E86C1",
    icon: "🗞️",
    feeds: [
      "https://news.google.com/rss/search?q=site:albayan.ae&hl=ar",
    ],
  },
  {
    id: "alarabiya",
    name: "Al Arabiya",
    color: "#F47920",
    icon: "🌐",
    feeds: [
      "https://news.google.com/rss/search?q=site:alarabiya.net&hl=en",
      "https://news.google.com/rss/search?q=site:alarabiya.net&hl=ar",
    ],
  },
  {
    id: "skynews-arabia",
    name: "Sky News Arabia",
    color: "#0072CE",
    icon: "🌍",
    feeds: [
      "https://www.skynewsarabia.com/web/rss",
      "https://www.skynewsarabia.com/rss",
      "https://news.google.com/rss/search?q=site:skynewsarabia.com+breaking&hl=ar",
      "https://news.google.com/rss/search?q=site:skynewsarabia.com&hl=ar",
    ],
  },
  {
    id: "asharqalawsat",
    name: "Asharq Al-Awsat",
    color: "#8B0000",
    icon: "📰",
    feeds: [
      "https://aawsat.com/feed",
      "https://aawsat.com/feed/rss",
      "https://english.aawsat.com/feed",
      "https://news.google.com/rss/search?q=site:aawsat.com&hl=en",
    ],
  },
  {
    id: "bbc",
    name: "BBC News",
    color: "#BB1919",
    icon: "📺",
    feeds: [
      "https://feeds.bbci.co.uk/news/rss.xml",
      "https://feeds.bbci.co.uk/news/world/rss.xml",
    ],
  },
  {
    id: "cnn",
    name: "CNN International",
    color: "#CC0000",
    icon: "🔴",
    feeds: [
      "https://news.google.com/rss/search?q=site:edition.cnn.com+OR+site:cnn.com&hl=en",
      "https://news.google.com/rss/search?q=site:cnn.com&hl=en&gl=US&ceid=US:en",
    ],
  },
  {
    id: "skynews",
    name: "Sky News",
    color: "#951B32",
    icon: "🌤️",
    feeds: [
      "https://feeds.skynews.com/feeds/rss/home.xml",
      "https://news.sky.com/feeds/rss/home.xml",
    ],
  },
  {
    id: "reuters",
    name: "Reuters",
    color: "#FF8000",
    icon: "⚡",
    feeds: [
      "https://news.google.com/rss/search?q=site:reuters.com&hl=en",
    ],
  },
  {
    id: "afp",
    name: "AFP",
    color: "#005BAA",
    icon: "🔵",
    feeds: [
      "https://news.google.com/rss/search?q=source:AFP&hl=en",
      "https://news.google.com/rss/search?q=site:afp.com&hl=en",
    ],
  },
  {
    id: "ft",
    name: "Financial Times",
    color: "#FCD0B1",
    icon: "💹",
    feeds: [
      "https://www.ft.com/rss/home",
      "https://www.ft.com/rss/home/uk",
    ],
  },
  {
    id: "economist",
    name: "The Economist",
    color: "#E3120B",
    icon: "📊",
    feeds: [
      "https://www.economist.com/latest/rss.xml",
      "https://www.economist.com/rss",
      "https://news.google.com/rss/search?q=site:economist.com&hl=en",
    ],
  },
];

// Social media trending topics in UAE via RSS proxies
const SOCIAL_SOURCES = [
  {
    id: "x-trending",
    name: "Trending on X - UAE",
    color: "#000000",
    icon: "𝕏",
    platform: "x",
    feeds: [
      "https://news.google.com/rss/search?q=UAE+OR+Dubai+OR+%22Abu+Dhabi%22+trending+twitter+OR+X&hl=en&gl=AE&ceid=AE:en",
      "https://news.google.com/rss/search?q=%22trending+in+UAE%22+OR+%22viral+UAE%22+twitter&hl=en",
    ],
  },
  {
    id: "tiktok-trending",
    name: "Trending on TikTok - UAE",
    color: "#00F2EA",
    icon: "🎵",
    platform: "tiktok",
    feeds: [
      "https://news.google.com/rss/search?q=tiktok+Dubai+OR+UAE+OR+%22Abu+Dhabi%22&hl=en&gl=AE&ceid=AE:en",
      "https://news.google.com/rss/search?q=tiktok+trending+Dubai+OR+UAE+viral&hl=en",
      "https://news.google.com/rss/search?q=tiktok+%22United+Arab+Emirates%22+OR+Dubai&hl=en",
    ],
  },
  {
    id: "instagram-trending",
    name: "Trending on Instagram - UAE",
    color: "#E1306C",
    icon: "📸",
    platform: "instagram",
    feeds: [
      "https://news.google.com/rss/search?q=UAE+OR+Dubai+OR+%22Abu+Dhabi%22+instagram+trending+OR+viral&hl=en&gl=AE&ceid=AE:en",
      "https://news.google.com/rss/search?q=%22instagram+UAE%22+OR+%22instagram+Dubai%22+trending&hl=en",
    ],
  },
];

// Cache
const cache = new Map();
const CACHE_TTL = 3 * 60 * 1000;

async function fetchFeed(source, retryCount = 0) {
  const cacheKey = source.id;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  let items = [];

  for (const feedUrl of source.feeds) {
    // Try rss-parser (enriched then simple), then raw regex parser
    let feedItems = null;
    let usedRaw = false;

    for (const p of [parser, parserSimple]) {
      try {
        const feed = await p.parseURL(feedUrl);
        if (feed.items && feed.items.length > 0) {
          feedItems = feed.items;
          break;
        }
      } catch {
        continue;
      }
    }

    // Fallback: raw XML fetch with lenient regex parsing
    if (!feedItems) {
      const rawItems = await fetchFeedRaw(feedUrl);
      if (rawItems) {
        feedItems = rawItems;
        usedRaw = true;
      }
    }

    if (!feedItems || feedItems.length === 0) continue;

    feedItems.sort((a, b) => {
      const dateA = parseDate(a.pubDate || a.isoDate);
      const dateB = parseDate(b.pubDate || b.isoDate);
      return dateB - dateA;
    });

    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const topDates = feedItems.slice(0, 5).map((item) =>
      parseDate(item.pubDate || item.isoDate)
    );
    const newestDate = Math.max(...topDates);
    if (newestDate > 0 && Date.now() - newestDate > SEVEN_DAYS) {
      continue;
    }

    items = feedItems.slice(0, 5).map((item) => ({
      title: item.title || "Untitled",
      link: item.link || "#",
      summary: extractSummary(item),
      pubDate: item.pubDate || item.isoDate || null,
    }));

    // Resolve Google News URLs to real article links
    await Promise.allSettled(
      items.map((article) => resolveGoogleNewsArticle(article))
    );

    if (items.length > 0) break;
  }

  // Retry once if no articles found
  if (items.length === 0 && retryCount < 1) {
    await new Promise(r => setTimeout(r, 2000));
    return fetchFeed(source, retryCount + 1);
  }

  const result = {
    id: source.id,
    name: source.name,
    color: source.color,
    icon: source.icon,
    platform: source.platform || null,
    articles: items,
    lastUpdated: new Date().toISOString(),
  };

  cache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

// For Google News sourced articles, try to find the real article
async function resolveGoogleNewsArticle(article) {
  if (!article.link || !article.link.includes("news.google.com")) return;

  const originalLink = article.link;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(article.link, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    // If redirect landed on a googleusercontent image URL, skip
    if (res.url && res.url.includes("googleusercontent.com")) {
      return;
    }

    // If redirected to real article site (not google)
    if (
      res.url &&
      !res.url.includes("google.com") &&
      !res.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
    ) {
      article.link = res.url;
      return;
    }

    // Parse the Google News page for the real URL
    const html = await res.text();

    // Try to find the real article URL (exclude google domains AND googleusercontent)
    const urlPatterns = [
      /data-n-au=["'](https?:\/\/[^"']+)["']/,
      /href=["'](https?:\/\/(?!(?:news|accounts|support|consent|play|lh\d)\.google)[^"']+)["']/,
    ];

    for (const pattern of urlPatterns) {
      const match = html.match(pattern);
      if (match && !match[1].includes("google.com") && !match[1].includes("googleusercontent.com")) {
        article.link = match[1];
        break;
      }
    }

  } catch {
    // Keep original Google News link on error
  }
}

function parseDate(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function stripHtml(text) {
  if (!text) return "";
  let clean = text.replace(/<[^>]*>/g, " ");
  clean = clean
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean;
}

function extractSummary(item) {
  const candidates = [
    item["content:encoded"],
    item.content,
    item.summary,
    item.description,
    item.contentSnippet,
    item["dc:description"],
  ];

  let best = "";

  for (const raw of candidates) {
    if (!raw) continue;
    const cleaned = stripHtml(raw);
    if (cleaned.length > best.length) {
      best = cleaned;
    }
  }

  if (best && item.title) {
    const titleClean = item.title.trim();
    if (best.startsWith(titleClean)) {
      best = best.slice(titleClean.length).trim();
      best = best.replace(/^[\s\-–—:|,]+/, "").trim();
    }
  }

  if (!best) {
    return "Tap to read the full article.";
  }

  if (best.length > 450) {
    const truncated = best.substring(0, 450);
    const lastPeriod = truncated.lastIndexOf(".");
    const lastQuestion = truncated.lastIndexOf("?");
    const lastExclaim = truncated.lastIndexOf("!");
    const boundary = Math.max(lastPeriod, lastQuestion, lastExclaim);
    if (boundary > 200) {
      best = truncated.substring(0, boundary + 1);
    } else {
      best = truncated.substring(0, 447) + "...";
    }
  }

  return best;
}

// Disable browser caching
app.use((req, res, next) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(express.static(path.join(__dirname, "public")));

// API: Get all news
app.get("/api/news", async (req, res) => {
  if (req.query.refresh === "true") {
    cache.clear();
  }

  try {
    const results = await Promise.allSettled(
      NEWS_SOURCES.map((source) => fetchFeed(source))
    );

    const news = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    res.json({
      success: true,
      data: news,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch news" });
  }
});

// API: Get social trending
app.get("/api/social", async (req, res) => {
  if (req.query.refresh === "true") {
    // Clear social cache entries
    SOCIAL_SOURCES.forEach((s) => cache.delete(s.id));
  }

  try {
    const results = await Promise.allSettled(
      SOCIAL_SOURCES.map((source) => fetchFeed(source))
    );

    const social = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    res.json({
      success: true,
      data: social,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch social trends" });
  }
});

// API: Get news for a specific source
app.get("/api/news/:sourceId", async (req, res) => {
  const source =
    NEWS_SOURCES.find((s) => s.id === req.params.sourceId) ||
    SOCIAL_SOURCES.find((s) => s.id === req.params.sourceId);
  if (!source) {
    return res.status(404).json({ success: false, error: "Source not found" });
  }

  try {
    const result = await fetchFeed(source);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch feed" });
  }
});

app.listen(PORT, () => {
  console.log(`News Dashboard running at http://localhost:${PORT}`);
});
