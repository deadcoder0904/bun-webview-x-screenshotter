/**
 * Tweet Extraction Script for Bun.WebView
 *
 * Single source of truth for tweet data extraction.
 * Injected into WebView to extract structured tweet data from xcancel.com.
 */

// Configuration
const config = {
  mainTweetSelector:
    "//div[contains(@class,'main-tweet')]//div[contains(@class,'tweet-body')]",
  replySelector: "//div[@id='r']//div[contains(@class,'tweet-body')]",
  statLabels: ['replies', 'retweets', 'likes', 'views'],
}

// DOM Helper Functions
function getXPath(xpath: string, context: Node = document): Element[] {
  const result = document.evaluate(
    xpath,
    context,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null,
  )
  const arr: Element[] = []
  for (let i = 0; i < result.snapshotLength; i++) {
    const node = result.snapshotItem(i)
    if (node && node.nodeType === Node.ELEMENT_NODE) {
      arr.push(node as Element)
    }
  }
  return arr
}

function getText(xpath: string, ctx: Node = document): string | null {
  const el = document.evaluate(
    xpath,
    ctx,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue as Element | null
  return el ? el.textContent?.trim() || null : null
}

function getAttr(
  xpath: string,
  attr: string,
  ctx: Node = document,
): string | null {
  const el = document.evaluate(
    xpath,
    ctx,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue as Element | null
  return el ? el.getAttribute(attr) : null
}

// Normalization Helpers
function normalizeAvatar(url: string): string {
  if (!url) return ''
  // For avatars, keep _bigger suffix as-is (Twitter CDN serves this correctly)
  // Only normalize query parameters, not the filename suffix
  return url
    .replace(
      /([?&])name=(small|medium|large|thumb|240x240|360x360|900x900)(?=(&|$))/g,
      '$1name=orig',
    )
    .replace(/([?&])format=webp(?=(&|$))/g, '$1format=jpg')
}

function normalizeImage(url: string): string {
  if (!url) return ''
  // For media attachments, normalize more aggressively
  return url
    .replace(
      /([?&])name=(small|medium|large|thumb|240x240|360x360|900x900)(?=(&|$))/g,
      '$1name=orig',
    )
    .replace(/([?&])format=webp(?=(&|$))/g, '$1format=jpg')
    .replace(/_bigger/g, '_orig')
}

function parseNumber(str: string): number {
  if (!str) return 0
  const digits = String(str).replace(/,/g, '')
  return digits ? Number(digits) : 0
}

// Parsing Functions
function parseStats(ctx: Element): {
  replies: number
  retweets: number
  likes: number
  views: number
} {
  const stats = getXPath(".//span[contains(@class,'tweet-stat')]", ctx)
  const out = { replies: 0, retweets: 0, likes: 0, views: 0 }

  stats.forEach((stat: Element, i: number) => {
    const text = stat.textContent?.replace(/[^\d,]/g, '').trim() || '0'
    const label = config.statLabels[i]
    if (label && label in out) {
      ;(out as any)[label] = parseNumber(text)
    }
  })

  return out
}

function parseQuote(ctx: Element): {
  name: string | null
  handle: string | null
  verified: boolean
  avatar: string
  date: string | null
  text: string | null
  media: string[]
} | null {
  const quote = getXPath(".//div[contains(@class,'quote')]", ctx)[0]
  if (!quote) return null

  const get = (xp: string) =>
    document.evaluate(
      xp,
      quote,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue as Element | null

  return {
    name: get(".//a[contains(@class,'fullname')]")?.textContent?.trim() || null,
    handle:
      get(".//a[contains(@class,'username')]")?.textContent?.trim() || null,
    verified: !!get(".//div[contains(@class,'verified-icon')]"),
    avatar: normalizeAvatar(
      get(".//img[contains(@class,'avatar')]")?.src || '',
    ),
    date:
      get(".//span[contains(@class,'tweet-date')]//a")?.textContent?.trim() ||
      null,
    text:
      get(".//div[contains(@class,'quote-text')]")?.textContent?.trim() || null,
    media: getXPath(".//img[not(contains(@class,'avatar'))]", quote)
      .map((img) => normalizeImage(img.src || ''))
      .filter(Boolean),
  }
}

function parseTweet(ctx: Element): {
  name: string | null
  handle: string | null
  verified: boolean
  avatar: string
  showSubscribe: boolean
  showMore: boolean
  text: string | null
  media: string[]
  quote: ReturnType<typeof parseQuote>
  time: string | null
  date: string | null
  stats: { replies: number; retweets: number; likes: number; views: number }
} {
  // Extract time and date from title attribute
  const dateEl = document.evaluate(
    ".//span[contains(@class,'tweet-date')]//a",
    ctx,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue as Element | null

  const titleAttr = dateEl?.getAttribute('title') || ''
  let time: string | null = null
  let date: string | null = null
  if (titleAttr) {
    const parts = titleAttr.split('·').map((s) => s.trim())
    if (parts.length === 2) {
      date = parts[0]
      time = parts[1].replace(/\s+UTC$/, '') // Strip trailing UTC
    }
  }

  return {
    name: getText(".//a[contains(@class,'fullname')]", ctx),
    handle: getText(".//a[contains(@class,'username')]", ctx),
    verified: !!getXPath(".//div[contains(@class,'verified-icon')]", ctx)
      .length,
    avatar: normalizeAvatar(
      getAttr(".//img[contains(@class,'avatar')]", 'src', ctx) || '',
    ),
    showSubscribe: true,
    showMore: false, // Not present in xcancel
    text: getText(".//div[contains(@class,'tweet-content')]", ctx),
    media: getXPath(
      ".//div[contains(@class,'attachments') and not(ancestor::*[contains(@class,'quote') or contains(@class,'quote-media-container')])]//img",
      ctx,
    )
      .map((img) => normalizeImage(img.src || ''))
      .filter(Boolean),
    quote: parseQuote(ctx),
    time,
    date,
    stats: parseStats(ctx),
  }
}

// Main Scraping Function
function scrapeTweets(): {
  main: ReturnType<typeof parseTweet> | null
  replies: ReturnType<typeof parseTweet>[]
} {
  try {
    const mainTweetNode = getXPath(config.mainTweetSelector, document)[0]
    const replyNodes = getXPath(config.replySelector, document)

    return {
      main: mainTweetNode ? parseTweet(mainTweetNode) : null,
      replies: replyNodes.map((node) => parseTweet(node)),
    }
  } catch (error) {
    console.error('Error scraping tweets:', error)
    return { main: null, replies: [] }
  }
}

// Execute and expose to global scope
try {
  console.log('🔍 Extracting tweet data...')
  const scrapedData = scrapeTweets()

  // Expose to global scope for the webview to access
  // @ts-ignore
  window.__TWEET_DATA__ = scrapedData
  // @ts-ignore
  window.__TWEET_EXTRACTION_COMPLETE__ = true

  console.log('✅ Tweet data exposed to window.__TWEET_DATA__')

  // Dispatch event
  const event = new CustomEvent('tweet-data-ready', { detail: scrapedData })
  window.dispatchEvent(event)

  // Return the data for immediate use
  return JSON.stringify(scrapedData)
} catch (error) {
  console.error('❌ Error:', error)
  // @ts-ignore
  window.__TWEET_EXTRACTION_ERROR__ =
    error instanceof Error ? error.message : String(error)
  return JSON.stringify({
    error: error instanceof Error ? error.message : String(error),
  })
}
