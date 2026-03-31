import type { FC } from 'hono/jsx';

export const DocsPage: FC = () => {
  return (
    <div class="docs">
      <h1>Local Development Mode</h1>
      <p>
        You're running locally. In production, this page redirects to the interactive API docs.
      </p>

      <section class="endpoint">
        <h2>Quick Links</h2>
        <ul>
          <li><a href="https://nigerian-markets-api-docs.vercel.app/docs" target="_blank" rel="noopener">Interactive API Docs (live)</a></li>
          <li><a href="/api">API Index</a></li>
          <li><a href="/api/states">GET /api/states</a></li>
          <li><a href="/api/markets?limit=10">GET /api/markets</a></li>
          <li><a href="/api/search?q=lagos">GET /api/search?q=lagos</a></li>
        </ul>
      </section>

      <section class="endpoint">
        <h2>Source Files</h2>
        <ul>
          <li><a href="https://github.com/ifihan/nigerian-markets-api/blob/main/openapi/openapi.yaml" target="_blank" rel="noopener">OpenAPI Spec</a></li>
          <li><a href="https://github.com/ifihan/nigerian-markets-api/tree/main/docs" target="_blank" rel="noopener">Docs App Source</a></li>
          <li><a href="https://github.com/ifihan/nigerian-markets-api" target="_blank" rel="noopener">GitHub Repository</a></li>
        </ul>
      </section>
    </div>
  );
};
