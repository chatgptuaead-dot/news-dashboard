const express = require("express");
const path = require("path");
const RSSParser = require("rss-parser");

const app = express();
const parser = new RSSParser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; NewsDashboard/1.0; +http://localhost)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["content:encoded", "content:encoded"],
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"],
    ],
  },
});

// Separate parser without customFields as fallback for feeds that choke on them
const parserSimple = new RSSParser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; NewsDashboard/1.0; +http://localhost)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

const PORT = process.env.PORT || 3456;

// News outlet configurations with RSS feed URLs
const NEWS_SOURCES = [
  {
    id: "bbc",
    name: "BBC News",
    color: "#BB1919",
    icon: "📺",
    feeds: [
      "https://feeds.bbci.co.uk/news/most_read/rss.xml",
      "https://feeds.bbci.co.uk/news/rss.xml",
    ],
  },
  {
    id: "cnn",
    name: "CNN",
    color: "#CC0000",
    icon: "🔴",
    feeds: [
      "http://rss.cnn.com/rss/edition.rss",
      "http://rss.cnn.com/rss/cnn_topstories.rss",
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
    id: "skynews-arabia",
    name: "Sky News Arabia",
    color: "#0072CE",
    icon: "🌍",
    feeds: [
      "https://www.skynewsarabia.com/web/rss",
      "https://news.google.com/rss/search?q=site:skynewsarabia.com&hl=ar",
    ],
  },
  {
    id: "lemonde",
    name: "Le Monde",
    color: "#1A1A1A",
    icon: "🇫🇷",
    feeds: [
      "https://www.lemonde.fr/rss/une.xml",
      "https://www.lemonde.fr/rss/en_continu.xml",
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
    id: "alarabiya",
    name: "Al Arabiya",
    color: "#F47920",
    icon: "🌐",
    feeds: [
      "https://english.alarabiya.net/tools/rss",
      "https://www.alarabiya.net/feed/rss2/ar.xml",
      "https://news.google.com/rss/search?q=site:english.alarabiya.net&hl=en",
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
    id: "reuters",
    name: "Reuters",
    color: "#FF8000",
    icon: "⚡",
    feeds: [
      "https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best",
      "https://news.google.com/rss/search?q=site:reuters.com&hl=en",
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
      "https://www.economist.com/rss",
      "https://www.economist.com/latest/rss.xml",
      "https://news.google.com/rss/search?q=site:economist.com&hl=en",
    ],
  },
];

// Cache to avoid hammering RSS feeds
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchFeed(source) {
  const cacheKey = source.id;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  let items = [];

  for (const feedUrl of source.feeds) {
    // Try both parsers — the enriched one first, then the simple fallback
    for (const p of [parser, parserSimple]) {
      try {
        const feed = await p.parseURL(feedUrl);
        if (feed.items && feed.items.length > 0) {
          // Sort all items by date (most recent first) before taking top 5
          const sorted = feed.items
            .map((item) => ({
              ...item,
              _parsedDate: parseDate(item.pubDate || item.isoDate),
            }))
            .sort((a, b) => b._parsedDate - a._parsedDate);

          items = sorted.slice(0, 5).map((item) => ({
            title: item.title || "Untitled",
            link: item.link || "#",
            summary: extractSummary(item),
            pubDate: item.pubDate || item.isoDate || null,
            image: extractImage(item),
          }));
          break;
        }
      } catch (err) {
        continue;
      }
    }
    if (items.length > 0) break; // Got items, stop trying other feed URLs
  }

  const result = {
    id: source.id,
    name: source.name,
    color: source.color,
    icon: source.icon,
    articles: items,
    lastUpdated: new Date().toISOString(),
  };

  cache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
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
  // Try multiple fields in order of detail richness
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
    // Pick the longest meaningful summary we can find
    if (cleaned.length > best.length) {
      best = cleaned;
    }
  }

  // If the title leaked into the summary, strip it out
  if (best && item.title) {
    const titleClean = item.title.trim();
    if (best.startsWith(titleClean)) {
      best = best.slice(titleClean.length).trim();
      // Remove leading punctuation after stripping title
      best = best.replace(/^[\s\-–—:|,]+/, "").trim();
    }
  }

  if (!best) {
    return "Tap to read the full article.";
  }

  // Allow up to 450 chars for more detailed summaries
  if (best.length > 450) {
    // Cut at last sentence boundary within limit
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

function extractImage(item) {
  // Try common RSS image locations
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  if (item["media:content"] && item["media:content"]["$"])
    return item["media:content"]["$"].url;
  if (item["media:thumbnail"] && item["media:thumbnail"]["$"])
    return item["media:thumbnail"]["$"].url;

  // Try to extract from content
  const content = item.content || item["content:encoded"] || "";
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgMatch) return imgMatch[1];

  return null;
}

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// API: Get all news
app.get("/api/news", async (req, res) => {
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

// API: Get news for a specific source
app.get("/api/news/:sourceId", async (req, res) => {
  const source = NEWS_SOURCES.find((s) => s.id === req.params.sourceId);
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

// API: List available sources
app.get("/api/sources", (req, res) => {
  res.json({
    success: true,
    data: NEWS_SOURCES.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      icon: s.icon,
    })),
  });
});

app.listen(PORT, () => {
  console.log(`News Dashboard running at http://localhost:${PORT}`);
});
