/**
 * news.js — Football News page
 * Pulls real articles from BBC Sport, ESPN, and Sky Sports via RSS feeds
 */

import { showToast } from '../main.js';
import { animate, stagger } from 'motion';

// RSS feed sources (proxied via Vite to avoid CORS)
const FEEDS = [
  { name: 'BBC Sport', url: '/rss/bbc', icon: '🔴', color: '#bb1919' },
  { name: 'ESPN FC', url: '/rss/espn', icon: '📺', color: '#d00' },
  { name: 'Sky Sports', url: '/rss/sky', icon: '🔵', color: '#0072c6' },
];

// Cache articles for 10 minutes
let cachedArticles = null;
let lastFetch = 0;
const CACHE_TTL = 10 * 60 * 1000;

export default async function newsPage(container) {
  container.innerHTML = `
    <div class="page__header" style="opacity:0">
      <div class="page__eyebrow">Latest Headlines</div>
      <h1 class="page__title">Football <span style="color:var(--gold)">News</span></h1>
      <p class="page__subtitle">Real-time articles from BBC Sport, ESPN FC & Sky Sports</p>
    </div>

    <div class="news-source-tabs" style="opacity:0">
      <button class="news-tab news-tab--active" data-filter="all">All Sources</button>
      ${FEEDS.map(f => `<button class="news-tab" data-filter="${f.name}">${f.icon} ${f.name}</button>`).join('')}
    </div>

    <div id="news-content">
      <div class="loading-state" style="text-align:center;padding:var(--space-2xl)">
        <div class="loading-spinner"></div>
        <p style="color:var(--chalk-dim);margin-top:var(--space-md)">Fetching latest articles...</p>
      </div>
    </div>
  `;

  animate('.page__header', { opacity: [0, 1], y: [16, 0] }, { duration: 0.4 });
  animate('.news-source-tabs', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.1 });

  // Fetch articles
  let articles;
  if (cachedArticles && (Date.now() - lastFetch < CACHE_TTL)) {
    articles = cachedArticles;
  } else {
    articles = await fetchAllFeeds();
    cachedArticles = articles;
    lastFetch = Date.now();
  }

  renderArticles(container, articles, 'all');

  // Tab filtering
  container.querySelectorAll('.news-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.news-tab').forEach(t => t.classList.remove('news-tab--active'));
      tab.classList.add('news-tab--active');
      renderArticles(container, articles, tab.dataset.filter);
    });
  });
}

async function fetchAllFeeds() {
  const results = await Promise.allSettled(
    FEEDS.map(feed => fetchFeed(feed))
  );

  const articles = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
    }
  }

  // Sort by date descending
  articles.sort((a, b) => (b.pubDate || 0) - (a.pubDate || 0));
  return articles;
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return parseRSS(text, feed);
  } catch (err) {
    console.warn(`Failed to fetch ${feed.name}:`, err);
    return [];
  }
}

function parseRSS(xml, feed) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const items = doc.querySelectorAll('item');
    const articles = [];

    items.forEach((item, i) => {
      if (i >= 15) return; // Cap at 15 per source

      const title = item.querySelector('title')?.textContent?.trim() || '';
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const description = item.querySelector('description')?.textContent?.trim() || '';
      const pubDateStr = item.querySelector('pubDate')?.textContent?.trim() || '';
      const pubDate = pubDateStr ? new Date(pubDateStr).getTime() : 0;

      // Try to get thumbnail
      const mediaThumbnail = item.querySelector('thumbnail')?.getAttribute('url')
        || item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'thumbnail')?.[0]?.getAttribute('url')
        || item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')?.[0]?.getAttribute('url')
        || '';

      // Strip HTML from description
      const cleanDesc = description.replace(/<[^>]*>/g, '').slice(0, 200);

      if (title) {
        articles.push({
          title,
          link,
          description: cleanDesc,
          pubDate,
          thumbnail: mediaThumbnail,
          source: feed.name,
          sourceIcon: feed.icon,
          sourceColor: feed.color,
        });
      }
    });

    return articles;
  } catch (err) {
    console.warn('RSS parse error:', err);
    return [];
  }
}

function renderArticles(container, articles, filter) {
  const filtered = filter === 'all' ? articles : articles.filter(a => a.source === filter);
  const contentEl = document.getElementById('news-content');
  if (!contentEl) return;

  if (filtered.length === 0) {
    contentEl.innerHTML = `
      <div class="empty-state" style="padding:var(--space-2xl)">
        <div class="empty-state__icon">📰</div>
        <div class="empty-state__title">No articles found</div>
        <p class="empty-state__text">Couldn't load articles from this source. Try refreshing the page.</p>
      </div>
    `;
    return;
  }

  contentEl.innerHTML = `
    <div class="news-articles">
      ${filtered.map(article => `
        <a href="${article.link}" target="_blank" rel="noopener" class="news-article" style="opacity:0">
          ${article.thumbnail ? `
            <div class="news-article__thumb">
              <img src="${article.thumbnail}" alt="" loading="lazy" />
            </div>
          ` : ''}
          <div class="news-article__body">
            <div class="news-article__source" style="color:${article.sourceColor}">
              ${article.sourceIcon} ${article.source}
            </div>
            <h3 class="news-article__title">${article.title}</h3>
            ${article.description ? `<p class="news-article__desc">${article.description}</p>` : ''}
            <div class="news-article__time">${formatTimeAgo(article.pubDate)}</div>
          </div>
        </a>
      `).join('')}
    </div>
  `;

  animate('.news-article', { opacity: [0, 1], y: [12, 0] }, { duration: 0.3, delay: stagger(0.04) });
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}
