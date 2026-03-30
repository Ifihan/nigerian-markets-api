import type { FC } from 'hono/jsx';

export const HomePage: FC = () => {
  return (
    <div class="home-page">
      {/* Ambient background grid */}
      <div class="ambient-grid" aria-hidden="true"></div>

      <section class="hero hero-modern">
        <div class="hero-copy">
          <div class="eyebrow">
            <span class="eyebrow-dot"></span>
            Open market intelligence for Nigeria
          </div>
          <h1>The living map of Nigerian markets.</h1>
          <p class="subtitle">
            Iya Oloja is a community-powered API and directory for markets across all 36 states and the FCT.
            Search, explore, and contribute to Nigeria's open market data.
          </p>

          <div class="hero-actions">
            <a href="/docs" class="btn btn-glow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
              Explore the API
            </a>
            <a href="/contribute" class="btn btn-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Submit a Market
            </a>
          </div>

          {/* Live stats strip */}
          <div class="stats-strip">
            <div class="stat-item">
              <span class="stat-number" data-count="37">37</span>
              <span class="stat-label">States covered</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-number" data-count="774">774</span>
              <span class="stat-label">LGAs mapped</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-number">Open</span>
              <span class="stat-label">Community data</span>
            </div>
          </div>
        </div>

        <div class="hero-visual">
          <div class="map-card">
            <div class="map-card-header">
              <div>
                <span class="map-kicker">Live coverage</span>
                <h2>Nigeria market pulse</h2>
              </div>
              <div class="map-legend">
                <span><i class="legend-dot legend-dot-hot"></i> Active markets</span>
                <span><i class="legend-dot legend-dot-watch"></i> Needs data</span>
              </div>
            </div>

            <div class="market-map">
              {/* SVG map of Nigeria outline with state boundaries */}
              <svg class="nigeria-svg" viewBox="0 0 800 700" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Nigeria outline - simplified polygon */}
                <path class="nigeria-outline" d="M280,80 L320,60 L380,55 L440,50 L500,55 L540,70 L580,90 L600,120 L620,160 L640,200 L660,250 L680,300 L690,350 L700,400 L690,440 L670,470 L640,490 L600,510 L560,530 L520,550 L480,560 L440,565 L400,560 L360,550 L320,530 L280,510 L250,490 L230,470 L210,440 L200,400 L190,360 L185,320 L190,280 L200,240 L210,200 L230,160 L250,120 L280,80Z" />

                {/* Grid lines for geographic feel */}
                <line class="grid-line" x1="100" y1="200" x2="750" y2="200" />
                <line class="grid-line" x1="100" y1="350" x2="750" y2="350" />
                <line class="grid-line" x1="100" y1="500" x2="750" y2="500" />
                <line class="grid-line" x1="300" y1="30" x2="300" y2="600" />
                <line class="grid-line" x1="450" y1="30" x2="450" y2="600" />
                <line class="grid-line" x1="600" y1="30" x2="600" y2="600" />

                {/* Market cluster nodes */}
                {/* Lagos */}
                <circle class="market-dot market-dot-hot" cx="310" cy="500" r="8">
                  <animate attributeName="r" values="8;12;8" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle class="market-dot-ring" cx="310" cy="500" r="16">
                  <animate attributeName="r" values="16;28;16" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
                </circle>
                <text class="map-label" x="328" y="505">Lagos</text>

                {/* Kano */}
                <circle class="market-dot market-dot-hot" cx="480" cy="110" r="7">
                  <animate attributeName="r" values="7;10;7" dur="3.5s" repeatCount="indefinite" />
                </circle>
                <circle class="market-dot-ring" cx="480" cy="110" r="14">
                  <animate attributeName="r" values="14;24;14" dur="3.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="3.5s" repeatCount="indefinite" />
                </circle>
                <text class="map-label" x="498" y="115">Kano</text>

                {/* Abuja / FCT */}
                <circle class="market-dot market-dot-hot" cx="430" cy="310" r="7">
                  <animate attributeName="r" values="7;10;7" dur="2.8s" repeatCount="indefinite" />
                </circle>
                <circle class="market-dot-ring" cx="430" cy="310" r="14">
                  <animate attributeName="r" values="14;24;14" dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="2.8s" repeatCount="indefinite" />
                </circle>
                <text class="map-label" x="448" y="315">Abuja</text>

                {/* Onitsha */}
                <circle class="market-dot market-dot-hot" cx="420" cy="460" r="5">
                  <animate attributeName="r" values="5;8;5" dur="3.2s" repeatCount="indefinite" />
                </circle>
                <text class="map-label" x="434" y="465">Onitsha</text>

                {/* Port Harcourt */}
                <circle class="market-dot market-dot-watch" cx="380" cy="520" r="5">
                  <animate attributeName="r" values="5;8;5" dur="4s" repeatCount="indefinite" />
                </circle>
                <text class="map-label" x="394" y="525">PH</text>

                {/* Ibadan */}
                <circle class="market-dot market-dot-hot" cx="300" cy="430" r="5">
                  <animate attributeName="r" values="5;7;5" dur="3.8s" repeatCount="indefinite" />
                </circle>
                <text class="map-label" x="312" y="435">Ibadan</text>

                {/* Kaduna */}
                <circle class="market-dot market-dot-watch" cx="440" cy="200" r="5">
                  <animate attributeName="r" values="5;7;5" dur="3.3s" repeatCount="indefinite" />
                </circle>
                <text class="map-label" x="454" y="205">Kaduna</text>

                {/* Maiduguri */}
                <circle class="market-dot market-dot-watch" cx="620" cy="130" r="4">
                  <animate attributeName="r" values="4;6;4" dur="4.2s" repeatCount="indefinite" />
                </circle>
                <text class="map-label" x="632" y="135">Maiduguri</text>

                {/* Jos */}
                <circle class="market-dot market-dot-watch" cx="490" cy="250" r="4">
                  <animate attributeName="r" values="4;6;4" dur="3.6s" repeatCount="indefinite" />
                </circle>

                {/* Enugu */}
                <circle class="market-dot market-dot-hot" cx="440" cy="420" r="4">
                  <animate attributeName="r" values="4;6;4" dur="3.4s" repeatCount="indefinite" />
                </circle>

                {/* Benin */}
                <circle class="market-dot market-dot-watch" cx="350" cy="470" r="4">
                  <animate attributeName="r" values="4;6;4" dur="3.9s" repeatCount="indefinite" />
                </circle>

                {/* Trade route lines */}
                <line class="trade-route" x1="310" y1="500" x2="430" y2="310" />
                <line class="trade-route" x1="430" y1="310" x2="480" y2="110" />
                <line class="trade-route" x1="310" y1="500" x2="420" y2="460" />
                <line class="trade-route" x1="420" y1="460" x2="430" y2="310" />
              </svg>

              {/* Floating tooltip */}
              <div class="map-tooltip">
                <span class="tooltip-ping"></span>
                <span class="tooltip-text">8 markets in Lagos</span>
              </div>
            </div>

            <div class="activity-ribbon">
              <div class="activity-column">
                <span class="activity-label">Hot zones</span>
                <p>Lagos, Kano, Abuja — highest market density</p>
              </div>
              <div class="activity-column">
                <span class="activity-label">Needs contributors</span>
                <p>Borno, Yobe, Zamfara — help fill the gaps</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="surface-grid">
        <div class="surface-card surface-card-glass">
          <div class="surface-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <span class="surface-kicker">Coverage</span>
          <h3>All 36 states + FCT in one API</h3>
          <p>
            Every state, LGA, and market is searchable and browsable. The data is community-maintained and always growing.
          </p>
        </div>

        <div class="surface-card surface-card-glass">
          <div class="surface-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <span class="surface-kicker">Community</span>
          <h3>Contribute markets via form or PR</h3>
          <p>
            Submit new markets through the web form or open a pull request. Every contribution is validated by CI before merging.
          </p>
        </div>

        <div class="surface-card surface-card-glass">
          <div class="surface-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          </div>
          <span class="surface-kicker">Developer-first</span>
          <h3>JSON API, zero auth required</h3>
          <div class="terminal terminal-hero">
            <div class="terminal-header">
              <span class="terminal-dot"></span>
              <span class="terminal-dot"></span>
              <span class="terminal-dot"></span>
            </div>
            <div class="terminal-body">
              <div class="terminal-line"><span class="terminal-prompt">$</span> curl /api/states/lagos</div>
              <div class="terminal-line"><span class="terminal-prompt">$</span> curl /api/search?q=balogun</div>
              <div class="terminal-line"><span class="terminal-prompt">$</span> curl /api/markets?limit=10</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
