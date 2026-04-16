import React, { useEffect, useLayoutEffect, useState } from 'react'
import { clampTweetText, SHOW_MORE_LABEL } from './tweetText'

// ===== SVG ICONS =====
const SVG = {
  verified: (
    <svg
      width='18'
      height='18'
      viewBox='0 0 22 22'
      aria-label='Verified'
      style={{ verticalAlign: '-2px' }}
    >
      <path
        d='M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.607-.274 1.264-.144 1.897.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z'
        fill='#1d9bf0'
      />
    </svg>
  ),
  comment: (
    <svg viewBox='0 0 24 24' width='18' height='18' fill='currentColor'>
      <path d='M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z' />
    </svg>
  ),
  retweet: (
    <svg viewBox='0 0 24 24' width='18' height='18' fill='currentColor'>
      <path d='M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z' />
    </svg>
  ),
  like: (
    <svg viewBox='0 0 24 24' width='18' height='18' fill='currentColor'>
      <path d='M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z' />
    </svg>
  ),
  bookmark: (
    <svg viewBox='0 0 24 24' width='18' height='18' fill='currentColor'>
      <path d='M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z' />
    </svg>
  ),
  share: (
    <svg viewBox='0 0 24 24' width='18' height='18' fill='currentColor'>
      <path d='M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z' />
    </svg>
  ),
  more: (
    <svg viewBox='0 0 24 24' width='18' height='18' fill='currentColor'>
      <path d='M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z' />
    </svg>
  ),
}

// ===== HELPERS =====
function fmtCount(n: number | undefined) {
  if (typeof n !== 'number') return ''
  if (n < 1000) return String(n)
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  if (n < 1e6) return Math.round(n / 1000) + 'K'
  if (n < 1e7) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n < 1e9) return Math.round(n / 1e6) + 'M'
  return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
}

function fmtViews(n: number | undefined) {
  return fmtCount(n)
}

function parseText(text: string | undefined): React.ReactNode[] {
  if (!text) return []

  // Basic regex matching for links, mentions, and hashtags
  const parts = text.split(/(https?:\/\/[^\s]+|@\w+|#\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('http')) {
      return (
        <a key={i} href={part} className='text-x-link no-underline'>
          {part}
        </a>
      )
    }
    if (part.startsWith('@')) {
      return (
        <span key={i} className='text-x-link'>
          {part}
        </span>
      )
    }
    if (part.startsWith('#')) {
      return (
        <span key={i} className='text-x-link'>
          {part}
        </span>
      )
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}

function MediaGrid({ media }: { media: string[] }) {
  if (!media || !media.length) return null
  const n = Math.min(media.length, 4)
  const isMulti = n > 1

  return (
    <div className='tweet-media'>
      <div
        className={`media-grid count-${n} mt-3 rounded-2xl overflow-hidden border border-x-border bg-x-border max-w-full ${isMulti ? 'grid grid-cols-2 max-h-80' : 'max-h-96'}`}
      >
        {media.slice(0, 4).map((src, i) => (
          <div
            key={i}
            className={`media-cell min-w-0 min-h-0 bg-x-bg ${isMulti ? 'aspect-square' : ''}`}
          >
            <img src={src} alt='' className='w-full h-full block object-cover' />
          </div>
        ))}
      </div>
    </div>
  )
}

function ActionItem({
  type,
  icon,
  count,
}: {
  type: string
  icon: React.ReactNode
  count: number | null
}) {
  const hoverColors: Record<string, string> = {
    reply: 'hover:text-[#1d9bf0]',
    retweet: 'hover:text-[#00ba7c]',
    like: 'hover:text-[#f91880]',
    bookmark: 'hover:text-[#1d9bf0]',
    share: 'hover:text-[#1d9bf0]',
  }
  const label = count !== null ? fmtCount(count) : ''

  return (
    <div
      className={`flex items-center gap-1 text-x-muted text-[13px] leading-4 px-2 py-2 rounded-full cursor-pointer transition-colors ${hoverColors[type] || ''}`}
    >
      {icon}
      {label && <span>{label}</span>}
    </div>
  )
}

export default function App() {
  const [data, setData] = useState<TweetData | null>(null)
  const [showFullText, setShowFullText] = useState(false)
  const [collapsedText, setCollapsedText] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    setShowFullText(false)

    // Check for tweet data from screenshot process
    if (window.__TWEET_DATA__) {
      // Handle both single tweet and scraper output
      const tweetData = (window.__TWEET_DATA__ as any).main
        ? (window.__TWEET_DATA__ as any).main
        : window.__TWEET_DATA__
      setData(tweetData as TweetData)
    } else {
      // Development fallback data with proper test cases
      const testTweets: TweetData[] = [
        // Tweet 1: Should show 279 chars before "Show more"
        {
          name: 'sphinx',
          handle: '@protosphinx',
          verified: true,
          avatar: 'https://pbs.twimg.com/profile_images/1234567890/avatar.jpg',
          showSubscribe: true,
          showMore: true,
          text: "back in the 90s, Microsoft would interview competitors' candidates to strip-mine them for product and strategy info, then not hire them.\n\nthat cutthroat behavior sat alongside casual NDA skirting, aggressive poaching, and hardball sales. it was considered smart.\n\nUS culture only",
          media: [],
          quote: {
            name: 'International Cyber Digest',
            handle: '@IntCyberDigest',
            verified: true,
            avatar: 'https://pbs.twimg.com/profile_images/digest.jpg',
            date: 'Nov 28, 2025',
            text: "This is a story about a dev who got a job interview at xAI, where they stripped him of his knowledge about how he used the user X API to create two impressive projects, hence the job interview.\n\nAfter they got what they wanted, X sent a cease and desist, and told him he wasn't hired.",
            media: ['https://pbs.twimg.com/media/cease-desist.jpg'],
          },
          time: '4:36 AM',
          date: 'Nov 29, 2025',
          stats: {
            replies: 46,
            retweets: 555,
            likes: 6100,
            views: 774249,
          },
        },
        // Tweet 2: Should show 276 chars before "Show more"
        {
          name: 'Chris Pisarski',
          handle: '@chrispisarski',
          verified: true,
          avatar: 'https://pbs.twimg.com/profile_images/chris.jpg',
          showSubscribe: true,
          showMore: true,
          text: "Lovable might be dying. Web traffic has declined ~50% from 35.4M in June to 19.1M in September.\n\nThis trend can be seen across other big vibe coding tools such as Replit and Bolt.\n\nHere's why I think this is happening:\n\n1) The viral wave has passed: Spring/summer hype (esp",
          media: ['https://pbs.twimg.com/media/lovable-chart.jpg'],
          quote: null,
          time: '10:17 PM',
          date: 'Oct 7, 2025',
          stats: {
            replies: 4,
            retweets: 3,
            likes: 55,
            views: 8544,
          },
        },
        // Tweet 3: Should show 279 chars (full tweet)
        {
          name: 'Julia Pintar',
          handle: '@juliapintar',
          verified: true,
          avatar: 'https://pbs.twimg.com/profile_images/julia.jpg',
          showSubscribe: true,
          showMore: false,
          text: "i am learning that you guys don't know how to talk to consumers\n\nfor your landing pages/app store PLS don't focus copy around your product\n\nfocus around the consumer -> how does it benefit them/make their life easier? use emotion-based copy\n\nattached a good + bad example below?",
          media: [
            'https://pbs.twimg.com/media/app-examples.jpg',
            'https://pbs.twimg.com/media/julia-selfie.jpg',
          ],
          quote: null,
          time: '9:27 PM',
          date: 'Nov 28, 2025',
          stats: {
            replies: 14,
            retweets: 16,
            likes: 367,
            views: 47677,
          },
        },
      ]

      // Use first tweet by default, or cycle through them
      setData(testTweets[0])
    }

    if (window.__THEME__ === 'light') {
      document.documentElement.classList.add('light')
    }

    // Set up a listener for dynamically updating the tweet without a reload
    const handleUpdate = () => {
      const tweetData = (window.__TWEET_DATA__ as any)?.main
        ? (window.__TWEET_DATA__ as any).main
        : window.__TWEET_DATA__
      setData(tweetData as TweetData)
      if (window.__THEME__ === 'light') {
        document.documentElement.classList.add('light')
      } else {
        document.documentElement.classList.remove('light')
      }
    }

    window.addEventListener('update-tweet-data', handleUpdate)
    return () => window.removeEventListener('update-tweet-data', handleUpdate)
  }, [])

  useLayoutEffect(() => {
    if (!data?.text) return

    if (data.showMore === true) {
      setCollapsedText(data.text)
      setIsCollapsed(true)
      return
    }

    const result = clampTweetText(data.text || undefined, () => true)
    setCollapsedText(result.truncated)
    setIsCollapsed(result.isClamped)
  }, [data])

  if (!data) return null

  const displayText = (showFullText ? data.text : collapsedText || data.text) || ''

  return (
    <div
      id='tweet-root'
      className='w-150 pt-3 px-4 pb-0 border-b border-x-border bg-x-bg text-x-text font-sans text-[15px] leading-5 antialiased mx-auto relative'
    >
      {/* Header */}
      <div className='flex items-start gap-3 mb-1'>
        <img
          className='w-10 h-10 rounded-full shrink-0 object-cover'
          src={data.avatar || ''}
          alt=''
        />
        <div className='flex-1 min-w-0 flex items-start justify-between'>
          <div className='flex flex-col min-w-0 flex-1'>
            <div className='flex items-center gap-0.5 min-w-0 max-w-full'>
              <span className='font-bold text-[15px] leading-5 text-x-text truncate'>
                {data.name || ''}
              </span>
              {data.verified && (
                <span className='shrink-0 ml-0.5 inline-flex items-center'>{SVG.verified}</span>
              )}
            </div>
            <div className='text-x-muted text-[15px] leading-5 whitespace-nowrap'>
              {data.handle || ''}
            </div>
          </div>
          <div className='flex items-center gap-1 shrink-0 ml-3'>
            {data.showSubscribe && (
              <button className='font-bold text-sm leading-4 bg-x-text text-x-bg border-none rounded-full px-4 py-1.5 cursor-pointer whitespace-nowrap min-h-8 font-[inherit]'>
                Subscribe
              </button>
            )}
            <div className='flex items-center justify-center w-8.5 h-8.5 rounded-full text-x-muted cursor-pointer hover:bg-x-hover transition-colors'>
              {SVG.more}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        className='mt-3 text-[17px] leading-6 whitespace-pre-wrap wrap-break-word text-x-text'
        id='tweet-text'
      >
        {parseText(displayText)}
        {isCollapsed && !showFullText && (
          <>
            {' '}
            <button
              className='inline cursor-pointer border-none p-0 text-[17px] leading-6 text-x-link'
              onClick={() => setShowFullText(true)}
              type='button'
            >
              {SHOW_MORE_LABEL}
            </button>
          </>
        )}
      </div>

      {/* Media */}
      <MediaGrid media={data.media} />

      {/* Quote Tweet */}
      {data.quote && (
        <div className='mt-3 border border-x-border rounded-2xl overflow-hidden cursor-pointer hover:bg-x-hover'>
          <div className='p-3'>
            <div className='flex items-center gap-1 mb-1 min-w-0'>
              {data.quote.avatar && (
                <img
                  className='w-5 h-5 rounded-full shrink-0 object-cover'
                  src={data.quote.avatar}
                  alt=''
                />
              )}
              <span className='font-bold text-[13px] leading-4 text-x-text whitespace-nowrap'>
                {data.quote.name || ''}
              </span>
              {data.quote.verified && (
                <span className='shrink-0 inline-flex items-center'>{SVG.verified}</span>
              )}
              <span className='text-x-muted text-[13px] leading-4 whitespace-nowrap'>
                {data.quote.handle || ''}
              </span>
              {data.quote.date && (
                <span className='text-x-muted text-[13px] leading-4 whitespace-nowrap'>
                  · {data.quote.date}
                </span>
              )}
            </div>
            <div className='text-[15px] leading-5 text-x-text whitespace-pre-wrap wrap-break-word'>
              {parseText(data.quote.text || '')}
            </div>
          </div>
          <MediaGrid media={data.quote.media} />
        </div>
      )}

      {/* Meta */}
      <div className='flex items-center gap-1 py-3 text-x-muted text-[15px] leading-5 flex-wrap'>
        <span>{data.time || ''}</span>
        <span className='mx-0.5'>·</span>
        <span>{data.date || ''}</span>
        <span className='mx-0.5'>·</span>
        <span className='font-bold text-x-text'>{fmtViews(data.stats?.views)}</span>
        <span> Views</span>
      </div>

      {/* Action Bar */}
      <div className='flex items-center justify-between border-t border-x-border py-1 -mx-1'>
        <ActionItem type='reply' icon={SVG.comment} count={data.stats?.replies ?? 0} />
        <ActionItem type='retweet' icon={SVG.retweet} count={data.stats?.retweets ?? 0} />
        <ActionItem type='like' icon={SVG.like} count={data.stats?.likes ?? 0} />
        <ActionItem type='bookmark' icon={SVG.bookmark} count={null} />
        <ActionItem type='share' icon={SVG.share} count={null} />
      </div>
    </div>
  )
}
