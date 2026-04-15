/**
 * Tweet Extraction Script for Bun.WebView
 * 
 * This is a standalone script that can be injected into WebView to extract tweet data.
 * It uses the same logic as the original bookmarklet but is designed to work with the
 * existing bun-x-screenshot project by exposing data to the global scope.
 */

// Configuration
const config = {
  mainTweetSelector: "//div[contains(@class,'main-tweet')]//div[contains(@class,'tweet-body')]",
  replySelector: "//div[@id='r']//div[contains(@class,'tweet-body')]",
  statLabels: ["comments", "retweets", "likes", "views"]
};

// DOM Helper Functions
function getXPath(xpath: string, context: Node = document): Element[] {
  const result = document.evaluate(xpath, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  const arr: Element[] = [];
  for (let i = 0; i < result.snapshotLength; i++) {
    const node = result.snapshotItem(i);
    if (node && node.nodeType === Node.ELEMENT_NODE) {
      arr.push(node as Element);
    }
  }
  return arr;
}

function getText(xpath: string, ctx: Node = document): string | null {
  const el = document.evaluate(xpath, ctx, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as Element | null;
  return el ? el.textContent?.trim() || null : null;
}

function getAttr(xpath: string, attr: string, ctx: Node = document): string | null {
  const el = document.evaluate(xpath, ctx, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as Element | null;
  return el ? el.getAttribute(attr) : null;
}

// Parsing Functions
function parseStats(ctx: Element): Record<string, string> {
  const stats = getXPath(".//div[contains(@class,'tweet-stat')]", ctx);
  const out: Record<string, string> = {
    comments: "0",
    retweets: "0", 
    likes: "0",
    views: "0"
  };

  stats.forEach((stat: Element, i) => {
    const text = stat.textContent?.replace(/[^\d,]/g, "").trim() || "0";
    const label = config.statLabels[i] || config.statLabels[config.statLabels.length - 1];
    out[label] = text;
  });

  return out;
}

function parseMedia(ctx: Element): string[] {
  return getXPath(".//div[contains(@class,'attachments')]//img", ctx)
    .map(img => img.getAttribute('src') || '')
    .filter(src => src);
}

function parseQuote(ctx: Element): any | null {
  const quote = getXPath(".//div[contains(@class,'quote')]", ctx)[0];
  if (!quote) return null;

  return {
    text: getText(".//div[contains(@class,'quote-text')]", quote),
    username: getText(".//a[contains(@class,'username')]", quote),
    name: getText(".//a[contains(@class,'fullname')]", quote),
    media: getXPath(".//img", quote)
      .map(img => img.getAttribute('src') || '')
      .filter(src => src)
  };
}

function parseTweet(ctx: Element): any {
  return {
    text: getText(".//div[contains(@class,'tweet-content')]", ctx),
    username: getText(".//a[contains(@class,'username')]", ctx),
    name: getText(".//a[contains(@class,'fullname')]", ctx),
    date: getText(".//span[contains(@class,'tweet-date')]//a", ctx),
    avatar: getAttr(".//img[contains(@class,'avatar')]", "src", ctx),
    stats: parseStats(ctx),
    media: parseMedia(ctx),
    quote: parseQuote(ctx)
  };
}

// Main Scraping Function
function scrapeTweets(): { main: any; replies: any[] } {
  try {
    const mainTweetNode = getXPath(config.mainTweetSelector, document)[0];
    const replyNodes = getXPath(config.replySelector, document);

    return {
      main: mainTweetNode ? parseTweet(mainTweetNode) : null,
      replies: replyNodes.map(node => parseTweet(node))
    };
  } catch (error) {
    console.error("Error scraping tweets:", error);
    return { main: null, replies: [] };
  }
}

// Execute and expose to global scope
try {
  console.log('🔍 Extracting tweet data...');
  const scrapedData = scrapeTweets();
  
  // Expose to global scope for the webview to access
  // @ts-ignore
  window.__TWEET_DATA__ = scrapedData;
  // @ts-ignore
  window.__TWEET_EXTRACTION_COMPLETE__ = true;
  
  console.log('✅ Tweet data exposed to window.__TWEET_DATA__');
  
  // Dispatch event
  const event = new CustomEvent('tweet-data-ready', { detail: scrapedData });
  window.dispatchEvent(event);
  
  // Return the data for immediate use
  JSON.stringify(scrapedData);
} catch (error) {
  console.error('❌ Error:', error);
  // @ts-ignore
  window.__TWEET_EXTRACTION_ERROR__ = error.message;
  JSON.stringify({ error: error.message });
}
