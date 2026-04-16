export const MAX_TWEET_CHARS = 280
export const DEFAULT_MAX_COLLAPSED_LINES = 7
export const SHOW_MORE_LABEL = 'Show more'

export interface TruncationResult {
  truncated: string
  isClamped: boolean
}

type FitsText = (text: string) => boolean

function normalizeText(text: string | undefined): string {
  return (text || '').replace(/\r\n/g, '\n')
}

function trimTrailingWhitespace(text: string): string {
  return text.replace(/[\s\u00a0]+$/u, '')
}

function collectBreakpoints(text: string): number[] {
  const points = new Set<number>([0])

  for (let i = 1; i <= text.length; i++) {
    const prev = text[i - 1]
    const next = text[i]

    if (i === text.length) {
      points.add(i)
      continue
    }

    if (/\s/u.test(prev) || /\s/u.test(next)) {
      points.add(i)
    }
  }

  return Array.from(points).sort((a, b) => a - b)
}

function trimToLastBreakpoint(text: string): string {
  const breakpoints = collectBreakpoints(text)
  const last = breakpoints[breakpoints.length - 2]
  if (last == null || last <= 0) return trimTrailingWhitespace(text)
  return trimTrailingWhitespace(text.slice(0, last))
}

function findLongestFittingPrefix(text: string, fits: FitsText): string {
  const breakpoints = collectBreakpoints(text)
  let low = 0
  let high = breakpoints.length - 1
  let best = ''

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = trimTrailingWhitespace(text.slice(0, breakpoints[mid]))

    if (fits(candidate)) {
      best = candidate
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  if (best) return best

  for (let i = 1; i <= text.length; i++) {
    const candidate = trimTrailingWhitespace(text.slice(0, i))
    if (!candidate) continue
    if (!fits(candidate)) return trimTrailingWhitespace(text.slice(0, i - 1))
    best = candidate
  }

  return best
}

export function clampTweetText(
  text: string | undefined,
  fitsCollapsedText: FitsText,
  maxChars = MAX_TWEET_CHARS
): TruncationResult {
  const normalized = normalizeText(text)
  if (!normalized) return { truncated: '', isClamped: false }

  const fitsFullText = normalized.length <= maxChars && fitsCollapsedText(normalized)
  if (fitsFullText) {
    return { truncated: normalized, isClamped: false }
  }

  const hardCapped = normalized.length > maxChars ? normalized.slice(0, maxChars) : normalized
  if (normalized.length > maxChars && fitsCollapsedText(hardCapped)) {
    return {
      truncated: trimToLastBreakpoint(hardCapped),
      isClamped: true,
    }
  }

  const truncated = findLongestFittingPrefix(hardCapped, fitsCollapsedText)

  return {
    truncated: truncated || trimTrailingWhitespace(hardCapped),
    isClamped: true,
  }
}

const DEFAULT_CHAR_WIDTHS: Array<[RegExp, number]> = [
  [/\n/u, 0],
  [/\s/u, 4.25],
  [/[ilIjtfr]/u, 5.1],
  [/[mwMW@#%&]/u, 13.2],
  [/[A-Z0-9]/u, 9.8],
  [/[.,:;!'`|]/u, 4.7],
]

function estimateCharWidth(char: string): number {
  for (const [pattern, width] of DEFAULT_CHAR_WIDTHS) {
    if (pattern.test(char)) return width
  }

  return 8.7
}

function wrapParagraphIntoLines(paragraph: string, maxWidth: number): number {
  if (!paragraph) return 1

  const words = paragraph.split(/(\s+)/u).filter(Boolean)
  let lines = 1
  let lineWidth = 0

  for (const word of words) {
    const tokenWidth = Array.from(word).reduce((total, char) => total + estimateCharWidth(char), 0)
    if (lineWidth > 0 && lineWidth + tokenWidth > maxWidth) {
      lines += 1
      lineWidth = 0
    }
    lineWidth += tokenWidth
  }

  return lines
}

export function createApproxTweetTextFitter({
  maxWidth = 520,
  maxLines = DEFAULT_MAX_COLLAPSED_LINES,
  suffix = ` ${SHOW_MORE_LABEL}`,
}: {
  maxWidth?: number
  maxLines?: number
  suffix?: string
} = {}): FitsText {
  const suffixWidth = Array.from(suffix).reduce((total, char) => total + estimateCharWidth(char), 0)

  return (text: string) => {
    const normalized = normalizeText(text)
    if (!normalized) return true

    const paragraphs = normalized.split('\n')
    let totalLines = 0

    for (let i = 0; i < paragraphs.length; i++) {
      const isLast = i === paragraphs.length - 1
      const availableWidth = isLast ? maxWidth - suffixWidth : maxWidth
      totalLines += wrapParagraphIntoLines(paragraphs[i], Math.max(availableWidth, maxWidth * 0.35))

      if (totalLines > maxLines) {
        return false
      }
    }

    return true
  }
}
