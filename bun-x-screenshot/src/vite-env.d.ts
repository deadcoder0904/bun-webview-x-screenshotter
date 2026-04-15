/// <reference types="vite/client" />

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

interface Window {
  __TWEET_DATA__?: TweetData;
  __THEME__?: string;
}
