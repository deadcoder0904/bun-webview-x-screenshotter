export const EXTRACT_TWEET_DATA_SCRIPT = `(function() {
  function text(el) {
    return (el && el.textContent ? el.textContent : '').trim();
  }

  function attr(el, name) {
    return (el && el.getAttribute && el.getAttribute(name)) || '';
  }

  function absoluteUrl(url) {
    if (!url) return '';
    try {
      return new URL(url, location.href).toString();
    } catch {
      return url;
    }
  }

  function normalizeImage(url) {
    const abs = absoluteUrl(url);
    if (!abs) return '';
    return abs
      .replace(/([?&])name=(small|medium|large|thumb|240x240|360x360|900x900)(?=(&|$))/g, '$1name=orig')
      .replace(/([?&])format=webp(?=(&|$))/g, '$1format=jpg');
  }

  function parseCount(value) {
    const digits = String(value || '').replace(/[^\\d]/g, '');
    return digits ? Number(digits) : 0;
  }

  function reformatShortDate(value) {
    const match = String(value || '').trim().match(/^(\\d{1,2})\\s+([A-Za-z]{3})\\s+(\\d{4})$/);
    if (!match) return String(value || '').trim();
    return match[2] + ' ' + Number(match[1]) + ', ' + match[3];
  }

  function parsePublished(raw) {
    const cleaned = String(raw || '').trim().replace(/\\s+/g, ' ');
    const match = cleaned.match(/^(.+?)\\s+·\\s+(.+?)(?:\\s+UTC)?$/i);
    if (!match) {
      return { fullDate: cleaned, time: '' };
    }

    const left = match[1].trim();
    const right = match[2].trim();
    const looksLikeTime = /\\b\\d{1,2}:\\d{2}\\s*[AP]M\\b/i.test(left);

    return looksLikeTime
      ? { time: left, fullDate: right }
      : { time: right, fullDate: left };
  }

  function extractMediaUrls(scope) {
    return Array.from(scope.querySelectorAll(':scope > .attachments img, :scope > .quote-media-container img'))
      .map(function(img) { return normalizeImage(img.currentSrc || img.src); })
      .filter(Boolean);
  }

  function extractQuote(root) {
    const quote = root.querySelector('.quote');
    if (!quote) return null;

    const dateLink = quote.querySelector('.tweet-date a');
    const media = Array.from(quote.querySelectorAll('.quote-media-container img, .attachments img'))
      .map(function(img) { return normalizeImage(img.currentSrc || img.src); })
      .filter(Boolean);

    return {
      name: text(quote.querySelector('.fullname')),
      handle: text(quote.querySelector('.username')),
      verified: !!quote.querySelector('.verified-icon.blue, .verified-icon'),
      avatar: normalizeImage(attr(quote.querySelector('.avatar'), 'src')),
      date: reformatShortDate(text(dateLink)),
      text: text(quote.querySelector('.quote-text')),
      media: media,
    };
  }

  const tweet = document.querySelector('.main-tweet');
  if (!tweet) return JSON.stringify({ error: 'main tweet not found' });

  const body = tweet.querySelector('.tweet-body');
  const stats = Array.from(tweet.querySelectorAll('.tweet-stats .tweet-stat')).map(function(stat) {
    return parseCount(text(stat));
  });
  const published = parsePublished(text(tweet.querySelector('.tweet-published')));

  const quote = extractQuote(tweet);
  const directMedia = Array.from(tweet.querySelectorAll('.tweet-body > .attachments img'))
    .map(function(img) { return normalizeImage(img.currentSrc || img.src); })
    .filter(Boolean);

  const data = {
    name: text(tweet.querySelector('.fullname')),
    handle: text(tweet.querySelector('.username')),
    verified: !!tweet.querySelector('.tweet-header .verified-icon.blue, .tweet-header .verified-icon'),
    avatar: normalizeImage(attr(tweet.querySelector('.tweet-avatar img, .tweet-header .avatar'), 'src')),
    showSubscribe: true,
    text: text(body && body.querySelector('.tweet-content')),
    media: directMedia,
    quote: quote,
    time: published.time,
    fullDate: published.fullDate,
    date: published.fullDate,
    views: stats[3] || 0,
    replies: stats[0] || 0,
    retweets: stats[1] || 0,
    likes: stats[2] || 0,
    bookmarks: 0,
  };

  return JSON.stringify(data);
})()`;

export const MEASURE_RENDERED_TWEET_SCRIPT = `(async function() {
  const root = document.getElementById('tweet-root');
  if (!root) return '600,600';

  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(images.map(function(img) {
    if (img.complete) return Promise.resolve();
    return new Promise(function(resolve) {
      const done = function() { resolve(); };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  }));

  await new Promise(function(resolve) { requestAnimationFrame(function() { requestAnimationFrame(resolve); }); });

  window.scrollTo(0, 0);
  const rect = root.getBoundingClientRect();
  return Math.ceil(rect.width) + ',' + Math.ceil(rect.height);
})()`;
