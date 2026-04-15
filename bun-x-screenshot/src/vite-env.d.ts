/// <reference types="vite/client" />

interface QuoteData {
  name: string | null;
  handle: string | null;
  verified: boolean;
  avatar: string;
  date: string | null;
  text: string | null;
  media: string[];
}

interface TweetStats {
  replies: number;
  retweets: number;
  likes: number;
  views: number;
}

interface TweetData {
  name: string | null;
  handle: string | null;
  verified: boolean;
  avatar: string;
  showSubscribe: boolean;
  showMore: boolean;
  text: string | null;
  media: string[];
  quote: QuoteData | null;
  time: string | null;
  date: string | null;
  stats: TweetStats;
}

interface ScraperOutput {
  main: TweetData | null;
  replies: TweetData[];
}

interface Window {
  __TWEET_DATA__?: TweetData | ScraperOutput;
  __THEME__?: string;
}
