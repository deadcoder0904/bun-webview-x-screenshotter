#!/usr/bin/env bun
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import tweets from './examples.json'

/**
 * Script injected into WebView to measure rendered tweet dimensions.
 * Waits for all images to load, then returns the bounding rect.
 */
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
})()`

// ─── Types (from vite-env.d.ts) ────────────────────────────────────────

interface QuoteData {
  name: string | null
  handle: string | null
  verified: boolean
  avatar: string
  date: string | null
  text: string | null
  media: string[]
}

interface TweetStats {
  replies: number
  retweets: number
  likes: number
  views: number
}

interface TweetData {
  name: string | null
  handle: string | null
  verified: boolean
  avatar: string
  showSubscribe: boolean
  showMore: boolean
  text: string | null
  media: string[]
  quote: QuoteData | null
  time: string | null
  date: string | null
  stats: TweetStats
}

interface ScraperOutput {
  main: TweetData | null
  replies: TweetData[]
}

// ─── Helpers ────────────────────────────────────────────────────────────

function buildRendererUrl(
  html: string,
  data: TweetData,
  theme: string,
): string {
  const bootstrap = `<script>window.__TWEET_DATA__=${JSON.stringify(data)};window.__THEME__=${JSON.stringify(theme)};</script>`
  return `data:text/html;charset=utf-8,${encodeURIComponent(html.replace('</head>', `${bootstrap}</head>`))}`
}

async function waitForSelector(
  view: any,
  selector: string,
  tries = 30,
  delayMs = 500,
) {
  for (let i = 0; i < tries; i++) {
    if (
      await view.evaluate(
        `!!document.querySelector(${JSON.stringify(selector)})`,
      )
    )
      return true
    await Bun.sleep(delayMs)
  }
  return false
}

// ─── Core ──────────────────────────────────────────────────────────────

interface ScreenshotOptions {
  urls: string[]
  tweetsDir: string
  useXcancel: boolean
  theme?: 'dark' | 'light'
}

async function takeScreenshots({
  urls,
  tweetsDir,
  useXcancel,
  theme = 'dark',
}: ScreenshotOptions) {
  const start = Bun.nanoseconds()
  await mkdir(tweetsDir, { recursive: true })

  const rendererHtml = await readFile(
    path.join(import.meta.dir, 'dist', 'index.html'),
    'utf8',
  )

  // Load tweet extraction script (compiled and minified)
  const scraperScript = await Bun.file(
    path.join(import.meta.dir, 'dist/extraction-script.js'),
  ).text()

  console.log('🚀 Initializing Bun.WebView...')
  // @ts-ignore - Bun.WebView is available in Bun >= 1.3.12
  const view = new Bun.WebView({ width: 1000, height: 800 })

  try {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const domain = useXcancel ? 'https://xcancel.com' : 'https://x.com'
      const targetUrl = url.replace(/https:\/\/(?:x|twitter)\.com/, domain)
      const outPath = path.join(tweetsDir, `tweet-${i + 1}.jpg`)

      console.log(`[${i + 1}/${urls.length}] 🐦 Processing: ${url}`)

      // 1. Load source tweet
      await view.resize(1000, 800)
      await view.navigate(targetUrl)

      const selector = useXcancel
        ? '.main-tweet'
        : 'article[data-testid="tweet"], article'
      if (!(await waitForSelector(view, selector))) {
        console.warn(
          '⚠️ Timeout waiting for tweet. Continuing with best-effort extraction...',
        )
      }
      await Bun.sleep(1200)

      // 2. Load and execute tweet-scraper
      console.log('🧾 Extracting tweet data...')
      const raw = JSON.parse(
        String(
          await view.evaluate(
            `(() => { ${scraperScript}; return scrapeTweets(); })()`,
          ),
        ),
      ) as ScraperOutput & { error?: string }
      if (raw.error)
        throw new Error(`Extraction failed for ${url}: ${raw.error}`)
      if (!raw.main) throw new Error(`No main tweet found for ${url}`)
      const tweetData = raw.main

      // 3. Render in controlled layout
      console.log('🖼️ Rendering...')
      await view.resize(620, 400)
      await view.navigate(buildRendererUrl(rendererHtml, tweetData, theme))

      if (!(await waitForSelector(view, '#tweet-root', 10, 100))) {
        throw new Error(`Renderer root not found for ${url}`)
      }

      // 4. Measure and resize to exact dimensions
      const dims = JSON.parse(
        String(await view.evaluate(MEASURE_TWEET_SCRIPT)),
      ) as { w: number; h: number }
      console.log(`📏 Resizing to ${dims.w}×${dims.h}...`)
      await view.resize(dims.w, dims.h)
      await Bun.sleep(150)

      // 5. Capture
      try {
        await Bun.file(outPath).delete()
      } catch {}
      const imageBase64 = await view.screenshot({
        format: 'jpeg',
        quality: 95,
        encoding: 'base64',
      })
      await Bun.write(outPath, Buffer.from(imageBase64, 'base64') as any)
      console.log(`✅ Saved: ${outPath}\n`)
    }

    const elapsed = (Bun.nanoseconds() - start) / 1_000_000
    return { count: urls.length, timeMs: elapsed }
  } finally {
    try {
      view?.close?.()
    } catch {}
  }
}

// ─── CLI Entry ─────────────────────────────────────────────────────────

if (import.meta.main) {
  const tweetsDir = path.join(import.meta.dir, 'tweets')

  console.log('--- Bun Tweet Screenshotter ---')
  console.log(`Saving to: ${tweetsDir}\n`)

  try {
    const result = await takeScreenshots({
      urls: tweets,
      tweetsDir,
      useXcancel: true,
    })
    console.log(
      `🎉 Done! ${result.count} screenshots in ${(result.timeMs / 1000).toFixed(2)}s`,
    )
  } catch (error) {
    console.error('❌ Fatal:', error)
    process.exit(1)
  }
}

export { takeScreenshots }
export type {
  ScreenshotOptions,
  TweetData,
  QuoteData,
  TweetStats,
  ScraperOutput,
}
