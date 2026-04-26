import { jsxRenderer } from 'hono/jsx-renderer';

const SITE_URL = 'https://iya-oloja.pages.dev';
const SITE_NAME = 'Iya Oloja';
const DEFAULT_TITLE = 'Iya Oloja — Nigerian Markets API';
const DEFAULT_DESC =
  'A community-powered API and directory for markets across all 36 states of Nigeria and the FCT. Search, explore, and contribute to open market data.';

export const renderer = jsxRenderer(({ children, title }) => {
  const pageTitle = title ?? DEFAULT_TITLE;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* SEO */}
        <title>{pageTitle}</title>
        <meta name="description" content={DEFAULT_DESC} />
        <meta
          name="keywords"
          content="Nigerian markets, Nigeria API, open data, market directory, Lagos markets, Kano markets, Abuja markets, LGA, states, JSON API"
        />
        <meta name="author" content="Iya Oloja Contributors" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={SITE_URL} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={DEFAULT_DESC} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={`${SITE_URL}/static/og.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="en_NG" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={DEFAULT_DESC} />
        <meta name="twitter:image" content={`${SITE_URL}/static/og.png`} />

        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

        {/* Theme Color */}
        <meta
          name="theme-color"
          content="#0a0f0d"
          media="(prefers-color-scheme: dark)"
        />
        <meta
          name="theme-color"
          content="#fafbf9"
          media="(prefers-color-scheme: light)"
        />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossorigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Styles */}
        <link href="/static/style.css" rel="stylesheet" />

        {/* Theme init (prevent flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            var t = localStorage.getItem('theme');
            if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.setAttribute('data-theme', 'dark');
            }
          })();
        `,
          }}
        />
      </head>
      <body>
        <nav class="nav">
          <div class="container nav-inner">
            <a href="/" class="nav-brand">
              Iya Oloja
            </a>
            <div class="nav-links">
              <a href="https://nigerian-markets-api-docs.vercel.app/docs" target="_blank" rel="noopener">Docs</a>
              <a href="/contribute">Contribute</a>
              <a
                href="https://github.com/ifihan/nigerian-markets-api"
                target="_blank"
                rel="noopener"
              >
                GitHub
              </a>
              <button
                class="theme-toggle"
                aria-label="Toggle theme"
                type="button"
              >
                <svg
                  class="icon-sun"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                <svg
                  class="icon-moon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </button>
            </div>
          </div>
        </nav>
        <main class="container">{children}</main>
        <footer class="footer">
          <div class="container">
            <p>
              Iya Oloja — Open data for Nigerian markets. Built with community
              contributions.
            </p>
          </div>
        </footer>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            var btn = document.querySelector('.theme-toggle');
            function update() {
              var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
              btn.querySelector('.icon-sun').style.display = isDark ? 'block' : 'none';
              btn.querySelector('.icon-moon').style.display = isDark ? 'none' : 'block';
            }
            update();
            btn.addEventListener('click', function() {
              var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
              if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
              } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
              }
              update();
            });
          })();
        `,
          }}
        />
      </body>
    </html>
  );
});
