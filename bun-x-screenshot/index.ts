#!/usr/bin/env bun
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import tweets from "./examples.json";

/**
 * DOM scripts injected into the WebView to extract tweet data and measure rendered output.
 * These run in the browser context (xcancel.com or the renderer HTML).
 */
const EXTRACT_TWEET_DATA_SCRIPT = `(function() {
  function text(el) {
    return (el && el.textContent ? el.textContent : '').trim();
  }

  function attr(el, name) {
    return (el && el.getAttribute && el.getAttribute(name)) || '';
  }

  function absoluteUrl(url) {
    if (!url) return '';
    try { return new URL(url, location.href).toString(); }
    catch { return url; }
  }

  function normalizeImage(url) {
    var abs = absoluteUrl(url);
    if (!abs) return '';
    return abs
      .replace(/([?&])name=(small|medium|large|thumb|240x240|360x360|900x900)(?=(&|$))/g, '$1name=orig')
      .replace(/([?&])format=webp(?=(&|$))/g, '$1format=jpg');
  }

  function parseCount(value) {
    var digits = String(value || '').replace(/[^\\d]/g, '');
    return digits ? Number(digits) : 0;
  }

  function reformatShortDate(value) {
    var match = String(value || '').trim().match(/^(\\d{1,2})\\s+([A-Za-z]{3})\\s+(\\d{4})$/);
    if (!match) return String(value || '').trim();
    return match[2] + ' ' + Number(match[1]) + ', ' + match[3];
  }

  function parsePublished(raw) {
    var cleaned = String(raw || '').trim().replace(/\\s+/g, ' ');
    var match = cleaned.match(/^(.+?)\\s+·\\s+(.+?)(?:\\s+UTC)?$/i);
    if (!match) return { fullDate: cleaned, time: '' };
    var left = match[1].trim(), right = match[2].trim();
    var looksLikeTime = /\\b\\d{1,2}:\\d{2}\\s*[AP]M\\b/i.test(left);
    return looksLikeTime ? { time: left, fullDate: right } : { time: right, fullDate: left };
  }

  function extractQuote(root) {
    var quote = root.querySelector('.quote');
    if (!quote) return null;
    var dateLink = quote.querySelector('.tweet-date a');
    var media = Array.from(quote.querySelectorAll('.quote-media-container img, .attachments img'))
      .map(function(img) { return normalizeImage(img.currentSrc || img.src); }).filter(Boolean);
    return {
      name: text(quote.querySelector('.fullname')),
      handle: text(quote.querySelector('.username')),
      verified: !!quote.querySelector('.verified-icon.blue, .verified-icon'),
      avatar: normalizeImage(attr(quote.querySelector('.avatar'), 'src')),
      date: reformatShortDate(text(dateLink)),
      text: text(quote.querySelector('.quote-text')),
      media: media,
    };
  }

  var tweet = document.querySelector('.main-tweet');
  if (!tweet) return JSON.stringify({ error: 'main tweet not found' });

  var body = tweet.querySelector('.tweet-body');
  var stats = Array.from(tweet.querySelectorAll('.tweet-stats .tweet-stat')).map(function(stat) {
    return parseCount(text(stat));
  });
  var published = parsePublished(text(tweet.querySelector('.tweet-published')));
  var directMedia = Array.from(tweet.querySelectorAll('.tweet-body > .attachments img'))
    .map(function(img) { return normalizeImage(img.currentSrc || img.src); }).filter(Boolean);

  return JSON.stringify({
    name: text(tweet.querySelector('.fullname')),
    handle: text(tweet.querySelector('.username')),
    verified: !!tweet.querySelector('.tweet-header .verified-icon.blue, .tweet-header .verified-icon'),
    avatar: normalizeImage(attr(tweet.querySelector('.tweet-avatar img, .tweet-header .avatar'), 'src')),
    showSubscribe: true,
    showMore: Array.from(body ? body.querySelectorAll('a, button, span, div') : []).some(function(el) {
      return text(el) === 'Show more';
    }) || undefined,
    text: text(body && body.querySelector('.tweet-content')),
    media: directMedia,
    quote: extractQuote(tweet),
    time: published.time,
    fullDate: published.fullDate,
    date: published.fullDate,
    views: stats[3] || 0,
    replies: stats[0] || 0,
    retweets: stats[1] || 0,
    likes: stats[2] || 0,
    bookmarks: 0,
  });
})()`;

const MEASURE_TWEET_SCRIPT = `(async function() {
  var root = document.getElementById('tweet-root');
  if (!root) return JSON.stringify({w: 600, h: 600});

  var images = Array.from(root.querySelectorAll('img'));
  await Promise.all(images.map(function(img) {
    if (img.complete) return Promise.resolve();
    return new Promise(function(resolve) {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));

  await new Promise(function(r) { requestAnimationFrame(function() { requestAnimationFrame(r); }); });

  window.scrollTo(0, 0);
  var rect = root.getBoundingClientRect();
  return JSON.stringify({ w: Math.ceil(rect.width), h: Math.ceil(rect.height) });
})()`;

// ─── Types ───────────────────────────────────────────────────────────

interface QuoteData {
  name: string;
  handle: string;
  verified: boolean;
  avatar: string;
  date: string;
  text: string;
  media: string[];
}

interface TweetData {
  name: string;
  handle: string;
  verified: boolean;
  avatar: string;
  showSubscribe: boolean;
  showMore?: boolean;
  text: string;
  media: string[];
  quote: QuoteData | null;
  time: string;
  fullDate: string;
  date: string;
  views: number;
  replies: number;
  retweets: number;
  likes: number;
  bookmarks: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function normalizeTweetData(raw: Partial<TweetData>): TweetData {
  return {
    ...raw,
    name: raw.name || '',
    handle: raw.handle || '',
    verified: raw.verified || false,
    avatar: raw.avatar || '',
    showSubscribe: raw.showSubscribe !== undefined ? raw.showSubscribe : true,
    showMore: raw.showMore === true ? true : undefined,
    text: raw.text || '',
    media: (raw.media || []).filter(Boolean),
    quote: raw.quote ? { 
      name: raw.quote.name || '',
      handle: raw.quote.handle || '',
      verified: raw.quote.verified || false,
      avatar: raw.quote.avatar || '',
      date: raw.quote.date || '',
      text: raw.quote.text || '',
      media: (raw.quote.media || []).filter(Boolean),
    } : null,
    time: raw.time || '',
    fullDate: raw.fullDate || raw.date || '',
    date: raw.date || raw.fullDate || '',
    views: raw.views || 0,
    replies: raw.replies || 0,
    retweets: raw.retweets || 0,
    likes: raw.likes || 0,
    bookmarks: raw.bookmarks || 0,
  };
}

function buildRendererUrl(html: string, data: TweetData, theme: string): string {
  const bootstrap = `<script>window.__TWEET_DATA__=${JSON.stringify(data)};window.__THEME__=${JSON.stringify(theme)};</script>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html.replace("</head>", `${bootstrap}</head>`))}`;
}

async function waitForSelector(view: any, selector: string, tries = 30, delayMs = 500) {
  for (let i = 0; i < tries; i++) {
    if (await view.evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return true;
    await Bun.sleep(delayMs);
  }
  return false;
}

// ─── Core ────────────────────────────────────────────────────────────

interface ScreenshotOptions {
  urls: string[];
  tweetsDir: string;
  useXcancel: boolean;
  theme?: "dark" | "light";
}

async function takeScreenshots({ urls, tweetsDir, useXcancel, theme = "dark" }: ScreenshotOptions) {
  const start = Bun.nanoseconds();
  await mkdir(tweetsDir, { recursive: true });

  const rendererHtml = await readFile(path.join(import.meta.dir, "dist-renderer", "index.html"), "utf8");

  console.log("🚀 Initializing Bun.WebView...");
  // @ts-ignore - Bun.WebView is available in Bun >= 1.3.12
  const view = new Bun.WebView({ width: 1000, height: 800 });

  try {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const domain = useXcancel ? "https://xcancel.com" : "https://x.com";
      const targetUrl = url.replace(/https:\/\/(?:x|twitter)\.com/, domain);
      const outPath = path.join(tweetsDir, `tweet-${i + 1}.jpg`);

      console.log(`[${i + 1}/${urls.length}] 🐦 Processing: ${url}`);

      // 1. Load source tweet
      await view.resize(1000, 800);
      await view.navigate(targetUrl);

      const selector = useXcancel ? ".main-tweet" : 'article[data-testid="tweet"], article';
      if (!(await waitForSelector(view, selector))) {
        console.warn("⚠️ Timeout waiting for tweet. Continuing with best-effort extraction...");
      }
      await Bun.sleep(1200);

      // 2. Extract structured data
      console.log("🧾 Extracting tweet data...");
      const raw = JSON.parse(
        String(await view.evaluate(EXTRACT_TWEET_DATA_SCRIPT)),
      ) as Partial<TweetData> & { error?: string };
      if (raw.error) throw new Error(`Extraction failed for ${url}: ${raw.error}`);
      const tweetData = normalizeTweetData(raw);

      // 3. Render in controlled layout
      console.log("🖼️ Rendering...");
      await view.resize(620, 400);
      await view.navigate(buildRendererUrl(rendererHtml, tweetData, theme));

      if (!(await waitForSelector(view, "#tweet-root", 10, 100))) {
        throw new Error(`Renderer root not found for ${url}`);
      }

      // 4. Measure and resize to exact dimensions
      const dims = JSON.parse(
        String(await view.evaluate(MEASURE_TWEET_SCRIPT))
      ) as { w: number; h: number };
      console.log(`📏 Resizing to ${dims.w}×${dims.h}...`);
      await view.resize(dims.w, dims.h);
      await Bun.sleep(150);

      // 5. Capture
      try {
        await Bun.file(outPath).delete();
      } catch {}
      const imageBase64 = await view.screenshot({
        format: "jpeg",
        quality: 95,
        encoding: "base64",
      });
      await Bun.write(outPath, Buffer.from(imageBase64, "base64") as any);
      console.log(`✅ Saved: ${outPath}\n`);
    }

    const elapsed = (Bun.nanoseconds() - start) / 1_000_000;
    return { count: urls.length, timeMs: elapsed };
  } finally {
    try {
      view?.close?.();
    } catch {}
  }
}

// ─── CLI Entry ───────────────────────────────────────────────────────

if (import.meta.main) {
  const tweetsDir = path.join(import.meta.dir, "tweets");

  console.log("--- Bun Tweet Screenshotter ---");
  console.log(`Saving to: ${tweetsDir}\n`);

  try {
    const result = await takeScreenshots({ urls: tweets, tweetsDir, useXcancel: true });
    console.log(`🎉 Done! ${result.count} screenshots in ${(result.timeMs / 1000).toFixed(2)}s`);
  } catch (error) {
    console.error("❌ Fatal:", error);
    process.exit(1);
  }
}

export { takeScreenshots };
export type { ScreenshotOptions, TweetData, QuoteData };
