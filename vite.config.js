import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://api.football-data.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/rss/bbc': {
        target: 'https://feeds.bbci.co.uk',
        changeOrigin: true,
        rewrite: () => '/sport/football/rss.xml',
      },
      '/rss/espn': {
        target: 'https://www.espn.com',
        changeOrigin: true,
        rewrite: () => '/espn/rss/soccer/news',
      },
      '/rss/sky': {
        target: 'https://www.skysports.com',
        changeOrigin: true,
        rewrite: () => '/rss/12040',
      },
    },
  },
});
