import type { FC } from 'hono/jsx';

export const NotFoundPage: FC = () => {
  return (
    <div class="not-found">
      <div class="not-found-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </div>
      <h1>404</h1>
      <p class="not-found-message">
        This page wandered off to the market and didn't come back.
      </p>
      <div class="not-found-suggestions">
        <p class="not-found-hint">Here are some places you can go:</p>
        <div class="not-found-links">
          <a href="/" class="btn btn-sm">
            Home
          </a>
          <a href="/docs" class="btn btn-sm btn-outline">
            Docs
          </a>
          <a href="/contribute" class="btn btn-sm btn-outline">
            Contribute
          </a>
        </div>
      </div>
    </div>
  );
};
