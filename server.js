const express = require("express");
const path = require("path");
const RSSParser = require("rss-parser");

const app = express();
const parser = new RSSParser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["content:encoded", "content:encoded"],
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"],
      ["media:group", "media:group"],
    ],
  },
});

const parserSimple = new RSSParser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

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
      "https://news.google.com/rss/search?q=site:wam.ae&hl=en",
    ],
  },
  {
    id: "aletihad",
    name: "Al Etihad",
    color: "#1B4F72",
    icon: "📰",
    feeds: [
      "https://www.aletihad.ae/rss",
      "https://news.google.com/rss/search?q=site:aletihad.ae&hl=ar",
    ],
  },
  {
    id: "alkhaleej",
    name: "Al Khaleej",
    color: "#C0392B",
    icon: "📜",
    feeds: [
      "https://www.alkhaleej.ae/rss",
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
      "https://www.albayan.ae/rss",
      "https://news.google.com/rss/search?q=site:albayan.ae&hl=ar",
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
      "https://news.google.com/rss/search?q=site:alarabiya.net&hl=en",
    ],
  },
  {
    id: "skynews-arabia",
    name: "Sky News Arabia",
    color: "#0072CE",
    icon: "🌍",
    feeds: [
      "https://www.skynewsarabia.com/web/rss",
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
      "http://rss.cnn.com/rss/edition.rss",
      "https://news.google.com/rss/search?q=site:edition.cnn.com&hl=en",
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
      "https://news.google.com/rss/search?q=site:reuters.com+breaking&hl=en",
      "https://news.google.com/rss/search?q=site:reuters.com&hl=en",
      "https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best",
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

// Social media trending topics via RSS proxies
const SOCIAL_SOURCES = [
  {
    id: "x-trending",
    name: "Trending on X",
    color: "#000000",
    icon: "𝕏",
    platform: "x",
    feeds: [
      "https://news.google.com/rss/search?q=trending+on+X+twitter+today&hl=en&gl=US&ceid=US:en",
      "https://news.google.com/rss/search?q=%22trending+on+twitter%22+OR+%22viral+tweet%22&hl=en",
    ],
  },
  {
    id: "tiktok-trending",
    name: "Trending on TikTok",
    color: "#00F2EA",
    icon: "🎵",
    platform: "tiktok",
    feeds: [
      "https://news.google.com/rss/search?q=trending+on+tiktok+viral&hl=en&gl=US&ceid=US:en",
      "https://news.google.com/rss/search?q=%22tiktok+trend%22+OR+%22viral+tiktok%22&hl=en",
    ],
  },
  {
    id: "instagram-trending",
    name: "Trending on Instagram",
    color: "#E1306C",
    icon: "📸",
    platform: "instagram",
    feeds: [
      "https://news.google.com/rss/search?q=trending+on+instagram+viral&hl=en&gl=US&ceid=US:en",
      "https://news.google.com/rss/search?q=%22instagram+trend%22+OR+%22viral+instagram%22&hl=en",
    ],
  },
];

// Cache
const cache = new Map();
const CACHE_TTL = 3 * 60 * 1000;

async function fetchFeed(source) {
  const cacheKey = source.id;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  let items = [];

  for (const feedUrl of source.feeds) {
    for (const p of [parser, parserSimple]) {
      try {
        const feed = await p.parseURL(feedUrl);
        if (feed.items && feed.items.length > 0) {
          feed.items.sort((a, b) => {
            const dateA = parseDate(a.pubDate || a.isoDate);
            const dateB = parseDate(b.pubDate || b.isoDate);
            return dateB - dateA;
          });

          const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
          const topDates = feed.items.slice(0, 5).map((item) =>
            parseDate(item.pubDate || item.isoDate)
          );
          const newestDate = Math.max(...topDates);
          if (newestDate > 0 && Date.now() - newestDate > SEVEN_DAYS) {
            continue;
          }

          items = feed.items.slice(0, 5).map((item) => ({
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
    if (items.length > 0) break;
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

function extractImage(item) {
  // 1. Enclosure
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;

  // 2. media:content
  if (item["media:content"]) {
    const mc = item["media:content"];
    if (mc["$"] && mc["$"].url) return mc["$"].url;
    if (typeof mc === "string") return mc;
    if (Array.isArray(mc) && mc[0] && mc[0]["$"]) return mc[0]["$"].url;
  }

  // 3. media:thumbnail
  if (item["media:thumbnail"]) {
    const mt = item["media:thumbnail"];
    if (mt["$"] && mt["$"].url) return mt["$"].url;
    if (typeof mt === "string") return mt;
  }

  // 4. media:group
  if (item["media:group"]) {
    const mg = item["media:group"];
    if (mg["media:content"] && mg["media:content"]["$"])
      return mg["media:content"]["$"].url;
  }

  // 5. Extract from content HTML
  const content =
    item.content || item["content:encoded"] || item.description || "";
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgMatch) return imgMatch[1];

  // 6. og:image pattern in link (generate a placeholder based on domain)
  return null;
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
