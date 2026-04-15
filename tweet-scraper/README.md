# Tweet Scraper for Bun.WebView

A simplified tweet scraping tool that extracts tweet data and makes it available for Bun.WebView screenshot functionality.

## Features

- **Automatic Extraction**: Extracts tweet data when injected into WebView
- **Global Exposure**: Exposes data to `window.__TWEET_DATA__` for easy access
- **Event Notification**: Dispatches `tweet-data-ready` event when complete
- **Error Handling**: Includes error handling and fallback mechanisms
- **Minimal Dependencies**: Pure TypeScript, no external dependencies required

## How It Works

1. **Extracts tweet data** from xcancel/twitter using XPath queries
2. **Exposes data globally** for the WebView to access
3. **Maintains compatibility** with the existing bun-x-screenshot workflow

## Usage with Bun.WebView

### 1. Import the extraction script

```typescript
import { WEBVIEW_EXTRACTION_SCRIPT } from './tweet-scraper/dist/extraction-script.js';
```

### 2. Inject and extract in your WebView

```typescript
// In your main index.ts
const view = new Bun.WebView();
await view.navigate('https://xcancel.com/...');

// Wait for page to load
await view.waitForSelector('.main-tweet');
await Bun.sleep(1200);

// Inject the scraper and get tweet data
const extractionResult = await view.evaluate(WEBVIEW_EXTRACTION_SCRIPT);
const tweetData = JSON.parse(extractionResult);

// Now use tweetData for your screenshot rendering
```

### 3. Or use the bundled version

```typescript
// Read the bundled script from file
const extractionScript = await Bun.file('./tweet-scraper/dist/extraction-script.js').text();
const result = await view.evaluate(extractionScript);
const tweetData = JSON.parse(result);
```

## Global Variables Exposed

- `window.__TWEET_DATA__` - The extracted tweet data object
- `window.__TWEET_EXTRACTION_COMPLETE__` - Boolean indicating if extraction is done
- `window.__TWEET_EXTRACTION_ERROR__` - Any error message if extraction failed

## Events

- `tweet-data-ready` - CustomEvent dispatched when extraction is complete

## Build

```bash
# Install dependencies
bun install

# Build the extraction script
bun run build

# Output is in dist/extraction-script.js
```

## Data Format

The extracted data has this structure:

```typescript
{
  main: {
    text: string | null;
    username: string | null;
    name: string | null;
    date: string | null;
    avatar: string | null;
    stats: {
      comments: string;
      retweets: string;
      likes: string;
      views: string;
    };
    media: string[];
    quote: {
      text: string | null;
      username: string | null;
      name: string | null;
      media: string[];
    } | null;
  } | null;
  replies: Array<{
    text: string | null;
    username: string | null;
    name: string | null;
    date: string | null;
    avatar: string | null;
    stats: Record<string, string>;
    media: string[];
    quote: any | null;
  }>;
}
```

## Integration with bun-x-screenshot

This project is designed to work seamlessly with the existing bun-x-screenshot project:

```typescript
// In your main index.ts, modify the takeScreenshots function:
async function takeScreenshotsWithAutoExtraction(urls: string[]) {
  const view = new Bun.WebView({ width: 1000, height: 800 });
  
  for (const url of urls) {
    await view.navigate(url);
    await view.waitForSelector('.main-tweet');
    await Bun.sleep(1200);
    
    // Extract tweet data using our scraper
    const extractionScript = await Bun.file('../tweet-scraper/dist/extraction-script.js').text();
    const scrapedData = JSON.parse(await view.evaluate(extractionScript));
    
    // Convert to renderer format and continue with existing screenshot logic
    const tweetData = convertScrapedData(scrapedData);
    
    // ... rest of your existing screenshot logic
  }
}
```

## Configuration

The scrape uses XPath selectors that can be modified in `src/extraction-script.ts`:

```typescript
const config = {
  mainTweetSelector: "//div[contains(@class,'main-tweet')]//div[contains(@class,'tweet-body')]",
  replySelector: "//div[@id='r']//div[contains(@class,'tweet-body')]",
  statLabels: ["comments", "retweets", "likes", "views"]
};
```

## License

MIT