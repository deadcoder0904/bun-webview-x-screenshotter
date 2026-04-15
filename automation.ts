import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { EXTRACT_TWEET_DATA_SCRIPT, MEASURE_RENDERED_TWEET_SCRIPT } from './dom-scripts'

export interface ScreenshotOptions {
  urls: string[]
  tweetsDir: string
  useXcancel: boolean
  theme?: 'dark' | 'light'
}

export interface ScreenshotResult {
  count: number
  timeMs: number
}

interface QuoteData {
  name: string
  handle: string
  verified: boolean
  avatar: string
  date: string
  text: string
  media: string[]
}

interface TweetData {
  name: string
  handle: string
  verified: boolean
  avatar: string
  showSubscribe: boolean
  text: string
  media: string[]
  quote: QuoteData | null
  time: string
  fullDate: string
  date: string
  views: number
  replies: number
  retweets: number
  likes: number
  bookmarks: number
}

function buildRendererUrl(html: string, tweetData: TweetData, theme: 'dark' | 'light'): string {
  const bootstrap = `<script>window.__TWEET_DATA__=${JSON.stringify(tweetData)};window.__THEME__=${JSON.stringify(theme)};</script>`
  const doc = html.replace('</head>', `${bootstrap}</head>`)
  return `data:text/html;charset=utf-8,${encodeURIComponent(doc)}`
}

function normalizeTweetData(raw: Partial<TweetData>): TweetData {
  return {
    name: raw.name || '',
    handle: raw.handle || '',
    verified: !!raw.verified,
    avatar: raw.avatar || '',
    showSubscribe: raw.showSubscribe !== false,
    text: raw.text || '',
    media: Array.isArray(raw.media) ? raw.media.filter(Boolean) : [],
    quote: raw.quote
      ? {
          name: raw.quote.name || '',
          handle: raw.quote.handle || '',
          verified: !!raw.quote.verified,
          avatar: raw.quote.avatar || '',
          date: raw.quote.date || '',
          text: raw.quote.text || '',
          media: Array.isArray(raw.quote.media) ? raw.quote.media.filter(Boolean) : [],
        }
      : null,
    time: raw.time || '',
    fullDate: raw.fullDate || raw.date || '',
    date: raw.date || raw.fullDate || '',
    views: Number(raw.views || 0),
    replies: Number(raw.replies || 0),
    retweets: Number(raw.retweets || 0),
    likes: Number(raw.likes || 0),
    bookmarks: Number(raw.bookmarks || 0),
  }
}

async function waitForSelector(view: Bun.WebView, selector: string, tries = 30, delayMs = 500) {
  for (let index = 0; index < tries; index++) {
    const found = await view.evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)
    if (found) return true
    await Bun.sleep(delayMs)
  }
  return false
}

export async function takeScreenshots({
  urls,
  tweetsDir,
  useXcancel,
  theme = 'dark',
}: ScreenshotOptions): Promise<ScreenshotResult> {
  const start = Bun.nanoseconds()
  await mkdir(tweetsDir, { recursive: true })

  const rendererPath = path.join(process.cwd(), 'tweet-renderer.html')
  const rendererHtml = await readFile(rendererPath, 'utf8')

  console.log('🚀 Initializing Bun.WebView...')

  // @ts-ignore - Bun.WebView is available in BUN >= 1.3.12
  const view = new Bun.WebView({
    width: 1000,
    height: 800,
  })

  try {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const domain = useXcancel ? 'https://xcancel.com' : 'https://x.com'
      const targetUrl = url.replace(/https:\/\/(?:x|twitter)\.com/, domain)
      const outPath = path.join(tweetsDir, `tweet-${i + 1}.jpg`)

      console.log(`[${i + 1}/${urls.length}] 🐦 Processing: ${url}`)
      console.log('🔗 Loading source tweet...')
      await view.resize(1000, 800)
      await view.navigate(targetUrl)

      const found = await waitForSelector(
        view,
        useXcancel ? '.main-tweet' : 'article[data-testid="tweet"], article',
      )

      if (!found) {
        console.warn('⚠️ Timeout waiting for source tweet. Continuing with best-effort extraction...')
      }

      await Bun.sleep(1200)

      console.log('🧾 Extracting structured tweet data...')
      const extraction = String(await view.evaluate(EXTRACT_TWEET_DATA_SCRIPT))
      const parsed = JSON.parse(extraction) as Partial<TweetData> & { error?: string }

      if (parsed.error) {
        throw new Error(`Extraction failed for ${url}: ${parsed.error}`)
      }

      const tweetData = normalizeTweetData(parsed)

      console.log('🖼️ Rendering controlled X-style layout...')
      await view.resize(620, 400)
      await view.navigate(buildRendererUrl(rendererHtml, tweetData, theme))

      const rendererReady = await waitForSelector(view, '#tweet-root', 10, 100)
      if (!rendererReady) {
        throw new Error(`Renderer root not found for ${url}`)
      }

      const dimsInfo = String(await view.evaluate(MEASURE_RENDERED_TWEET_SCRIPT))
        .trim()
        .replace(/^"|"$/g, '')
        .split(',')

      if (dimsInfo.length !== 2 || Number.isNaN(Number(dimsInfo[0])) || Number.isNaN(Number(dimsInfo[1]))) {
        throw new Error(`Invalid renderer dimensions for ${url}: ${dimsInfo.join(',')}`)
      }

      const width = Number(dimsInfo[0])
      const height = Number(dimsInfo[1])

      console.log(`📏 Resizing output viewport to ${width}x${height}...`)
      await view.resize(width, height)
      await Bun.sleep(150)

      try {
        await Bun.file(outPath).delete()
      } catch {}

      const imageBase64 = await view.screenshot({
        format: 'jpeg',
        quality: 95,
        encoding: 'base64',
      })

      await Bun.write(outPath, Buffer.from(imageBase64, 'base64') as any)
      console.log(`✅ Saved to: ${outPath}\n`)
    }

    const end = Bun.nanoseconds()
    return {
      count: urls.length,
      timeMs: (end - start) / 1_000_000,
    }
  } finally {
    try {
      if (view && view.close) view.close()
    } catch {}
  }
}
