# Bun WebView X Screenshotter

> Generate high-quality tweet screenshots using Bun's WebView. Extracts tweets from X/Twitter (or xcancel.com), renders them in a clean React component, and saves perfect screenshots.

## Features

- **WebView-based scraping**: Uses Bun's built-in WebView to navigate and extract tweet data
- **Dual source support**: Works with both `x.com` and `xcancel.com` URLs
- **Accurate rendering**: Renders tweets using React + Tailwind CSS matching the original Twitter UI
- **Smart sizing**: Measures rendered content to produce perfectly-sized screenshots (no extra whitespace)
- **Full tweet data extraction**:
  - Author info (name, handle, verified status, avatar)
  - Tweet text with link/mention/hashtag parsing
  - Media attachments (images)
  - Quote tweets
  - Statistics (replies, retweets, likes, views)
  - Date and time
- **Theme support**: Dark and light theme options
- **Batch processing**: Process multiple tweet URLs in sequence
- **Single-file output**: Uses vite-plugin-singlefile for portable HTML rendering

## Quick Start

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Take screenshots of tweets in examples.json
bun run screenshot
```

Screenshots are saved to the `tweets/` directory as `tweet-1.jpg`, `tweet-2.jpg`, etc.

## Usage

### Add Tweet URLs

Edit `examples.json` to add the tweets you want to screenshot:

```json
["https://x.com/user/status/123456789", "https://x.com/anotheruser/status/987654321"]
```

### Command Line Options

Modify `index.ts` to customize the screenshot options:

```typescript
const result = await takeScreenshots({
  urls: tweets, // Array of tweet URLs
  tweetsDir: 'tweets', // Output directory
  useXcancel: true, // Use xcancel.com instead of x.com
  theme: 'dark', // 'dark' or 'light'
})
```

### Programmatic Usage

```typescript
import { takeScreenshots } from './index'

await takeScreenshots({
  urls: ['https://x.com/user/status/123'],
  tweetsDir: './output',
  useXcancel: true,
  theme: 'dark',
})
```

## Project Structure

```
bun-webview-x-screenshotter/
├── index.ts              # Main entry point - WebView management & screenshot logic
├── src/
│   ├── App.tsx           # React component for tweet rendering
│   ├── main.tsx          # React entry point
│   ├── tweetText.ts      # Text clamping/logic for "Show more" button
│   ├── vite-env.d.ts     # TypeScript declarations
│   └── webview/
│       └── extraction-script.ts  # XPath-based tweet data extraction
├── examples.json         # Sample tweet URLs to screenshot
├── vite.config.ts        # Vite + Tailwind + SingleFile plugin config
├── package.json
└── tweets/               # Output directory for screenshots
```

## How It Works

1. **Navigation**: WebView navigates to the tweet URL (x.com or xcancel.com)
2. **Extraction**: Injected JavaScript (`extraction-script.ts`) uses XPath to extract tweet data from the DOM
3. **Rendering**: Tweet data is passed to a React component (`App.tsx`) that renders it with Tailwind CSS
4. **Measurement**: Script measures the rendered tweet's exact dimensions
5. **Resize & Capture**: WebView resizes to fit the content exactly, then captures a screenshot

## Configuration

### Environment

- **Bun**: Requires Bun >= 1.3.12 (for WebView API)
- **Vite+**: Uses Vite+ toolchain (wraps Vite, Oxlint, etc.)

### Development

```bash
# Run the dev server (Vite + React)
bun run dev

# Type check
bun run typecheck

# Lint
bun run lint

# Full check (lint + typecheck + format)
bun run check
```

### Build

```bash
# Build the extraction script (minified)
bun run build:extraction

# Build the renderer (React + Vite)
bun run build:renderer

# Full build
bun run build
```

## Customization

### Modify Tweet Rendering

Edit `src/App.tsx` to change the tweet appearance:

- Adjust colors in Tailwind CSS classes
- Modify layout and spacing
- Change which elements are displayed

### Add New Selectors

If x.com or xcancel.com changes their DOM structure, update the XPath selectors in:

- `src/webview/extraction-script.ts` - for data extraction
- `index.ts` - for element waiting (e.g., `waitForSelector`)

### Themes

The renderer supports dark and light themes. Pass `theme: 'light'` to `takeScreenshots()` for light mode.

## Output

Screenshots are saved as JPEG files with:

- Quality: 95%
- Format: JPEG
- Dimensions: Exact content dimensions (no padding)

## Tips

- **Rate limiting**: Add delays between requests to avoid rate limits
- **Error handling**: The script logs warnings but continues with best-effort extraction on timeouts
- **Debugging**: Use `console.log` in the extraction script - output appears in the Bun console

## License

MIT
